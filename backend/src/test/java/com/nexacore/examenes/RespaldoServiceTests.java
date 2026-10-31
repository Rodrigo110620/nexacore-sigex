package com.nexacore.examenes;

import com.nexacore.examenes.services.RespaldoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import java.util.zip.GZIPInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * IMP-10: respaldo con pg_dump. Se usa un pg_dump falso (script) que imprime sus argumentos y si
 * recibió la contraseña por PGPASSWORD, para no depender de un PostgreSQL real.
 */
@DisabledOnOs(OS.WINDOWS)
class RespaldoServiceTests {

    @TempDir Path tmp;

    private Path pgDumpFalso(String cuerpo) throws IOException {
        Path script = tmp.resolve("pg_dump_falso.sh");
        Files.writeString(script, "#!/bin/sh\n" + cuerpo + "\n");
        script.toFile().setExecutable(true);
        return script;
    }

    private RespaldoService servicio(Path pgDump, String url, String directorio, int conservar) {
        DataSourceProperties ds = new DataSourceProperties();
        ds.setUrl(url);
        ds.setUsername("nexacore");
        ds.setPassword("clave-secreta");
        return new RespaldoService(ds, pgDump.toString(), directorio, conservar, 1);
    }

    @Test
    void ejecutaPgDumpConLosParametrosDelLaboratorioYLaClaveSoloEnElEntorno() throws IOException {
        Path script = pgDumpFalso("echo \"ARGS: $*\"; echo \"CLAVE: $PGPASSWORD\"; echo \"SSL: $PGSSLMODE\"");
        var salida = new ByteArrayOutputStream();

        servicio(script, "jdbc:postgresql://db-interno:6543/nexacore-db?sslmode=require", "", 7).generar(salida);

        String texto = salida.toString(StandardCharsets.UTF_8);
        assertThat(texto).contains("ARGS: -h db-interno -p 6543 -U nexacore -d nexacore-db --clean --if-exists --no-owner --no-privileges");
        // La contraseña llega por PGPASSWORD y nunca como argumento.
        assertThat(texto).contains("CLAVE: clave-secreta").contains("SSL: require");
        assertThat(texto.lines().filter(l -> l.startsWith("ARGS:")).findFirst().orElseThrow()).doesNotContain("clave-secreta");
    }

    @Test
    void sinPuertoUsaElDe5432() throws IOException {
        Path script = pgDumpFalso("echo \"ARGS: $*\"");
        var salida = new ByteArrayOutputStream();

        servicio(script, "jdbc:postgresql://localhost/taller_TIS", "", 7).generar(salida);

        assertThat(salida.toString(StandardCharsets.UTF_8)).contains("-h localhost -p 5432 -U nexacore -d taller_TIS");
    }

    @Test
    void siPgDumpFallaInformaSuError() throws IOException {
        Path script = pgDumpFalso("echo 'connection refused' >&2; exit 1");

        assertThatThrownBy(() -> servicio(script, "jdbc:postgresql://localhost:5432/x", "", 7).generar(new ByteArrayOutputStream()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("connection refused");
    }

    @Test
    void sinClienteDePostgresLoAvisa() {
        assertThatThrownBy(() -> servicio(tmp.resolve("no-existe"), "jdbc:postgresql://localhost:5432/x", "", 7).generar(new ByteArrayOutputStream()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cliente de PostgreSQL");
    }

    @Test
    void soloFuncionaConPostgres() throws IOException {
        Path script = pgDumpFalso("echo ok");

        assertThatThrownBy(() -> servicio(script, "jdbc:h2:mem:prueba", "", 7).generar(new ByteArrayOutputStream()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PostgreSQL");
    }

    @Test
    void elRespaldoAutomaticoSeComprimeYConservaSoloLosMasRecientes() throws IOException {
        Path script = pgDumpFalso("echo '-- respaldo de prueba'");
        Path dir = Files.createDirectories(tmp.resolve("respaldos"));
        for (int dia = 1; dia <= 5; dia++) Files.writeString(dir.resolve("sigex-respaldo-2020010" + dia + "-0300.sql.gz"), "viejo");
        Files.writeString(dir.resolve("otro-archivo.txt"), "no se toca");

        Path nuevo = servicio(script, "jdbc:postgresql://localhost:5432/x", dir.toString(), 3).guardarEnDirectorio();

        try (InputStream in = new GZIPInputStream(Files.newInputStream(nuevo))) {
            assertThat(new String(in.readAllBytes(), StandardCharsets.UTF_8)).contains("-- respaldo de prueba");
        }
        try (Stream<Path> archivos = Files.list(dir)) {
            assertThat(archivos.map(p -> p.getFileName().toString()).sorted()).containsExactly(
                    "otro-archivo.txt", "sigex-respaldo-20200104-0300.sql.gz", "sigex-respaldo-20200105-0300.sql.gz",
                    nuevo.getFileName().toString());
        }
    }
}
