package com.nexacore.examenes.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import java.util.zip.GZIPOutputStream;

/**
 * Respaldo de la base de datos con pg_dump (IMP-10).
 *
 * El laboratorio no respalda las bases de los grupos: el respaldo lo genera el propio backend con las
 * mismas credenciales del datasource. El archivo se restaura con
 * {@code psql -h HOST -p PUERTO -U USUARIO -d BASE < respaldo.sql} (sin DROP/CREATE DATABASE).
 *
 * pg_dump se ejecuta sin shell (argumentos separados) y la contraseña va en PGPASSWORD, nunca en la
 * línea de comandos ni en los logs.
 */
@Service
public class RespaldoService {

    private static final Logger log = LoggerFactory.getLogger(RespaldoService.class);
    private static final DateTimeFormatter SELLO = DateTimeFormatter.ofPattern("yyyyMMdd-HHmm");
    static final String PREFIJO = "sigex-respaldo-";

    private final DataSourceProperties datasource;
    private final String pgDump;
    private final String directorio;
    private final int conservar;
    private final long minutosMaximos;

    public RespaldoService(DataSourceProperties datasource,
                           @Value("${app.respaldo.pg-dump:pg_dump}") String pgDump,
                           @Value("${app.respaldo.directorio:}") String directorio,
                           @Value("${app.respaldo.conservar:7}") int conservar,
                           @Value("${app.respaldo.minutos-maximos:10}") long minutosMaximos) {
        this.datasource = datasource;
        this.pgDump = pgDump;
        this.directorio = directorio;
        this.conservar = Math.max(1, conservar);
        this.minutosMaximos = minutosMaximos;
    }

    /** Datos de conexión sacados de spring.datasource.url (jdbc:postgresql://host:puerto/base?parámetros). */
    record Conexion(String host, int puerto, String base, String usuario, String sslmode) {
    }

    static Conexion conexion(String url, String usuario) {
        if (url == null || !url.startsWith("jdbc:postgresql://")) {
            throw new IllegalStateException("El respaldo solo está disponible con PostgreSQL.");
        }
        URI uri = URI.create(url.substring("jdbc:".length()));
        String base = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
        String sslmode = null;
        if (uri.getQuery() != null) {
            for (String par : uri.getQuery().split("&")) {
                if (par.startsWith("sslmode=")) sslmode = par.substring("sslmode=".length());
            }
        }
        return new Conexion(uri.getHost(), uri.getPort() > 0 ? uri.getPort() : 5432, base, usuario, sslmode);
    }

    /** Argumentos de pg_dump, separados (sin shell). Los parámetros son los que pide el laboratorio. */
    List<String> comando(Conexion c) {
        return List.of(pgDump, "-h", c.host(), "-p", String.valueOf(c.puerto()), "-U", c.usuario(), "-d", c.base(),
                "--clean", "--if-exists", "--no-owner", "--no-privileges");
    }

    /** Nombre del archivo de respaldo, con la fecha y hora de Bolivia. */
    public String nombreArchivo(String extension) {
        return PREFIJO + LocalDateTime.now().format(SELLO) + extension;
    }

    /**
     * Escribe el respaldo (SQL plano) en {@code salida}. Si pg_dump falla, lanza la excepción con su
     * mensaje de error y lo que se haya escrito no sirve como respaldo.
     */
    public void generar(OutputStream salida) {
        Conexion c = conexion(datasource.determineUrl(), datasource.determineUsername());
        ProcessBuilder pb = new ProcessBuilder(comando(c));
        Map<String, String> entorno = pb.environment();
        String clave = datasource.determinePassword();
        if (clave != null) entorno.put("PGPASSWORD", clave);
        if (c.sslmode() != null) entorno.put("PGSSLMODE", c.sslmode());
        Path errores = null;
        try {
            errores = Files.createTempFile("pg_dump-", ".err");
            pb.redirectError(errores.toFile());
            Process proceso = pb.start();
            try (InputStream datos = proceso.getInputStream()) {
                datos.transferTo(salida);
            }
            if (!proceso.waitFor(minutosMaximos, TimeUnit.MINUTES)) {
                proceso.destroyForcibly();
                throw new IllegalStateException("El respaldo tardó más de " + minutosMaximos + " minutos y se canceló.");
            }
            if (proceso.exitValue() != 0) {
                String detalle = Files.readString(errores, StandardCharsets.UTF_8).strip();
                throw new IllegalStateException("pg_dump terminó con error: " + (detalle.isEmpty() ? "código " + proceso.exitValue() : detalle));
            }
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo ejecutar pg_dump. ¿Está instalado el cliente de PostgreSQL en el servidor?", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("El respaldo se interrumpió.", e);
        } finally {
            if (errores != null) {
                try {
                    Files.deleteIfExists(errores);
                } catch (IOException ignorado) {
                    // Es un archivo temporal: el sistema lo limpia.
                }
            }
        }
    }

    /**
     * Respaldo automático cada noche (por defecto a las 03:00, hora de Bolivia), comprimido, en
     * {@code app.respaldo.directorio}. Conserva los últimos {@code app.respaldo.conservar}.
     * Sin directorio configurado no hace nada: el respaldo se descarga desde Configuración.
     */
    @Scheduled(cron = "${app.respaldo.cron:0 0 3 * * *}", zone = "America/La_Paz")
    public void respaldoProgramado() {
        if (directorio == null || directorio.isBlank()) return;
        try {
            Path archivo = guardarEnDirectorio();
            log.info("Respaldo automático guardado: {}", archivo.getFileName());
        } catch (RuntimeException e) {
            log.error("No se pudo generar el respaldo automático: {}", e.getMessage());
        }
    }

    /** Genera un respaldo comprimido en el directorio configurado y borra los más antiguos. */
    public Path guardarEnDirectorio() {
        Path dir = Path.of(directorio);
        Path destino = dir.resolve(nombreArchivo(".sql.gz"));
        Path parcial = dir.resolve(destino.getFileName() + ".parcial");
        try {
            Files.createDirectories(dir);
            try (OutputStream salida = new GZIPOutputStream(Files.newOutputStream(parcial))) {
                generar(salida);
            }
            Files.move(parcial, destino);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar el respaldo en " + dir, e);
        } finally {
            try {
                Files.deleteIfExists(parcial);
            } catch (IOException ignorado) {
                // Si quedó, se reemplaza en el próximo respaldo.
            }
        }
        borrarAntiguos(dir);
        return destino;
    }

    /** Deja solo los respaldos más recientes. */
    void borrarAntiguos(Path dir) {
        List<Path> respaldos = new ArrayList<>();
        try (Stream<Path> archivos = Files.list(dir)) {
            archivos.filter(p -> p.getFileName().toString().startsWith(PREFIJO) && p.getFileName().toString().endsWith(".sql.gz"))
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .forEach(respaldos::add);
        } catch (IOException e) {
            log.warn("No se pudieron revisar los respaldos antiguos: {}", e.getMessage());
            return;
        }
        for (Path viejo : respaldos.subList(Math.min(conservar, respaldos.size()), respaldos.size())) {
            try {
                Files.delete(viejo);
            } catch (IOException e) {
                log.warn("No se pudo borrar el respaldo antiguo {}: {}", viejo.getFileName(), e.getMessage());
            }
        }
    }
}
