package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ImportarEstudiantesResponse;
import com.nexacore.examenes.dto.RevisionImportacionResponse;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Comparator;
import java.util.stream.Collectors;

/**
 * Importación masiva de estudiantes desde CSV (hasta 10 000 por archivo).
 *
 * Cada fila pasa por las mismas validaciones que el registro individual. Las filas válidas se
 * guardan por bloques de {@value #BLOQUE} con {@link RegistroLoteEstudiantesService}: una fila con
 * error no impide guardar las demás. Si la base rechaza un bloque entero, ese bloque se reintenta
 * fila por fila con {@link EstudianteService#registrar} para informar el error de cada una.
 */
@Service
public class ImportacionEstudiantesService {

    static final List<String> COLUMNAS = List.of(
        "codigoSis", "nombre", "apellidos", "ci", "email", "idFacultad", "idCarrera"
    );
    /** Columnas opcionales (IMP-06): si no vienen, sin teléfono y MATRICULADO. */
    static final List<String> COLUMNAS_OPCIONALES = List.of("telefono", "estadoMatricula");
    static final int MAX_FILAS = 10_000;
    static final int BLOQUE = 500;

    private final EstudianteService estudianteService;
    private final RegistroLoteEstudiantesService registroLote;
    private final Validator validator;

    public ImportacionEstudiantesService(EstudianteService estudianteService,
                                         RegistroLoteEstudiantesService registroLote, Validator validator) {
        this.estudianteService = estudianteService;
        this.registroLote = registroLote;
        this.validator = validator;
    }

    /** Fila válida del archivo, lista para guardar; el prefijo es "Fila N: " para sus errores. */
    private record Pendiente(String prefijo, RegistrarEstudianteRequest request) {
    }

    /** El archivo leído y validado fila por fila (sin guardar): filas listas y errores con su fila y columna. */
    private record Lectura(int filas, List<Pendiente> pendientes, List<RevisionImportacionResponse.ErrorFila> errores) {
    }

    private Lectura leer(MultipartFile file) {
        String contenido = LecturaCsv.leerArchivo(file);
        CSVFormat formato = LecturaCsv.formato(contenido);
        List<RevisionImportacionResponse.ErrorFila> errores = new ArrayList<>();
        List<Pendiente> pendientes = new ArrayList<>();
        Set<String> sisEnArchivo = new HashSet<>();
        Set<String> ciEnArchivo = new HashSet<>();
        Set<String> emailEnArchivo = new HashSet<>();

        try (CSVParser parser = CSVParser.parse(contenido, formato)) {
            LecturaCsv.validarEncabezados(parser.getHeaderNames(), COLUMNAS);

            List<CSVRecord> filas = parser.getRecords();
            if (filas.isEmpty()) {
                throw new IllegalArgumentException("El archivo no tiene filas de estudiantes.");
            }
            if (filas.size() > MAX_FILAS) {
                throw new IllegalArgumentException(
                    "El archivo supera el máximo de " + MAX_FILAS + " estudiantes por importación.");
            }

            for (CSVRecord fila : filas) {
                // +1 por la fila de encabezados: coincide con la numeración de Excel.
                int numero = (int) fila.getRecordNumber() + 1;
                Validacion validacion = validarFila(fila, sisEnArchivo, ciEnArchivo, emailEnArchivo);
                if (validacion.error() == null) {
                    pendientes.add(new Pendiente("Fila " + numero + ": ", validacion.request()));
                } else {
                    errores.add(new RevisionImportacionResponse.ErrorFila(numero, validacion.columna(), validacion.error()));
                }
            }
            return new Lectura(filas.size(), pendientes, errores);
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo CSV.");
        } catch (UncheckedIOException e) {
            throw new IllegalArgumentException("El archivo CSV tiene un formato inválido.");
        }
    }

    public ImportarEstudiantesResponse importar(MultipartFile file) {
        Lectura lectura = leer(file);
        return guardar(lectura, (hechas) -> { });
    }

    /** Guarda las filas listas por bloques de 500; {@code avance} recibe cuántas filas lleva procesadas. */
    private ImportarEstudiantesResponse guardar(Lectura lectura, java.util.function.IntConsumer avance) {
        int insertados = 0;
        int ignorados = lectura.errores().size();
        List<String> errores = new ArrayList<>();
        for (var e : lectura.errores()) errores.add("Fila " + e.fila() + ": " + e.mensaje());
        List<Pendiente> pendientes = lectura.pendientes();
        int procesadas = lectura.errores().size();
        avance.accept(procesadas);

        List<String> erroresAlGuardar = new ArrayList<>();
        for (int desde = 0; desde < pendientes.size(); desde += BLOQUE) {
            List<Pendiente> bloque = pendientes.subList(desde, Math.min(desde + BLOQUE, pendientes.size()));
            List<String> resultado = guardarBloque(bloque);
            for (int i = 0; i < bloque.size(); i++) {
                if (resultado.get(i) == null) {
                    insertados++;
                } else {
                    ignorados++;
                    erroresAlGuardar.add(bloque.get(i).prefijo() + resultado.get(i));
                }
            }
            procesadas += bloque.size();
            avance.accept(procesadas);
        }
        // Los errores se informan en el orden de las filas del archivo.
        errores.addAll(erroresAlGuardar);
        errores.sort(Comparator.comparingInt(ImportacionEstudiantesService::numeroDeFila));
        return new ImportarEstudiantesResponse(insertados, ignorados, errores);
    }

    /** Para saber qué estudiantes ya están registrados (revisión); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc;

    /**
     * Sección 22, paso «Revisar»: valida el archivo sin guardar. Además de los errores por fila, separa los
     * estudiantes que ya están registrados (mismo código SIS, CI o correo) y las carreras o facultades que no existen.
     */
    public RevisionImportacionResponse revisar(MultipartFile file) {
        Lectura lectura = leer(file);
        List<RevisionImportacionResponse.ErrorFila> errores = new ArrayList<>(lectura.errores());
        int yaRegistradas = 0;
        int listas = 0;
        if (jdbc != null && !lectura.pendientes().isEmpty()) {
            Set<String> sis = new HashSet<>(), ci = new HashSet<>(), email = new HashSet<>();
            Set<Integer> facultades = new HashSet<>(), carreras = new HashSet<>();
            for (Pendiente p : lectura.pendientes()) {
                sis.add(p.request().codigoSis());
                ci.add(p.request().ci());
                email.add(p.request().email());
            }
            Set<String> sisExistentes = existentes("SELECT codigo_sis FROM estudiante WHERE codigo_sis IN (:v)", sis);
            Set<String> ciExistentes = existentes("SELECT ci FROM estudiante WHERE ci IN (:v)", ci);
            Set<String> emailExistentes = existentes("SELECT LOWER(email) FROM estudiante WHERE LOWER(email) IN (:v)", email);
            jdbc.query("SELECT id_facultad FROM facultad", rs -> { facultades.add(rs.getInt(1)); });
            jdbc.query("SELECT id_carrera FROM carrera", rs -> { carreras.add(rs.getInt(1)); });
            for (Pendiente p : lectura.pendientes()) {
                var r = p.request();
                int fila = numeroDeFila(p.prefijo());
                if (sisExistentes.contains(r.codigoSis()) || ciExistentes.contains(r.ci()) || emailExistentes.contains(r.email())) {
                    yaRegistradas++;
                } else if (r.idFacultad() != null && !facultades.contains(r.idFacultad())) {
                    errores.add(new RevisionImportacionResponse.ErrorFila(fila, "Facultad", "la facultad " + r.idFacultad() + " no existe."));
                } else if (r.idCarrera() != null && !carreras.contains(r.idCarrera())) {
                    errores.add(new RevisionImportacionResponse.ErrorFila(fila, "Carrera", "la carrera " + r.idCarrera() + " no existe."));
                } else {
                    listas++;
                }
            }
        } else {
            listas = lectura.pendientes().size();
        }
        errores.sort(Comparator.comparingInt(RevisionImportacionResponse.ErrorFila::fila));
        String nombre = file.getOriginalFilename();
        return new RevisionImportacionResponse(nombre, ExcelACsv.esExcel(nombre) ? "Excel" : "CSV",
            lectura.filas(), listas, errores.size(), yaRegistradas, errores);
    }

    private Set<String> existentes(String sql, Set<String> valores) {
        Set<String> encontrados = new HashSet<>();
        List<String> lista = new ArrayList<>(valores);
        for (int desde = 0; desde < lista.size(); desde += 1000) {
            jdbc.query(sql, java.util.Map.of("v", lista.subList(desde, Math.min(desde + 1000, lista.size()))),
                rs -> { encontrados.add(rs.getString(1)); });
        }
        return encontrados;
    }

    /** Importaciones en curso o recién terminadas (se borran 10 min después de terminar). */
    private final java.util.Map<String, Progreso> enCurso = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ExecutorService hilo = java.util.concurrent.Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "importacion-estudiantes");
        t.setDaemon(true);
        return t;
    });

    private static final class Progreso {
        final String id = java.util.UUID.randomUUID().toString();
        final String usuario;
        final int total;
        final long inicio = System.currentTimeMillis();
        volatile int procesadas;
        volatile ImportarEstudiantesResponse resultado;
        volatile String error;
        volatile Long segundos;
        volatile long terminadaEn;

        Progreso(String usuario, int total) {
            this.usuario = usuario;
            this.total = total;
        }

        com.nexacore.examenes.dto.ProgresoImportacionResponse vista() {
            String estado = error != null ? "FALLIDA" : resultado != null ? "LISTA" : "EN_CURSO";
            return new com.nexacore.examenes.dto.ProgresoImportacionResponse(id, estado, procesadas, total, resultado, segundos, error);
        }
    }

    /**
     * Sección 22, paso «Importando»: lee y valida el archivo ahora y guarda en segundo plano por bloques de 500;
     * el avance se consulta con {@link #progreso}. La sesión del usuario se usa también en el hilo de guardado.
     */
    public com.nexacore.examenes.dto.ProgresoImportacionResponse iniciar(MultipartFile file) {
        Lectura lectura = leer(file);
        String usuario = com.nexacore.examenes.security.SesionActual.email();
        Progreso progreso = new Progreso(usuario, lectura.filas());
        limpiarTerminadas();
        enCurso.put(progreso.id, progreso);
        Runnable tarea = () -> {
            try {
                progreso.resultado = guardar(lectura, hechas -> progreso.procesadas = hechas);
            } catch (RuntimeException e) {
                progreso.error = "No se pudo completar la importación. Revisa los estudiantes registrados e inténtalo de nuevo.";
            } finally {
                progreso.segundos = Math.max(1, Math.round((System.currentTimeMillis() - progreso.inicio) / 1000.0));
                progreso.terminadaEn = System.currentTimeMillis();
            }
        };
        hilo.submit(new org.springframework.security.concurrent.DelegatingSecurityContextRunnable(tarea));
        return progreso.vista();
    }

    /** Avance de una importación de este mismo usuario; null si no existe (o es de otro usuario). */
    public com.nexacore.examenes.dto.ProgresoImportacionResponse progreso(String id) {
        Progreso p = enCurso.get(id);
        if (p == null || !java.util.Objects.equals(p.usuario, com.nexacore.examenes.security.SesionActual.email())) return null;
        return p.vista();
    }

    private void limpiarTerminadas() {
        long limite = System.currentTimeMillis() - 10 * 60_000L;
        enCurso.values().removeIf(p -> p.terminadaEn > 0 && p.terminadaEn < limite);
    }

    /** Guarda el bloque de una vez; si la base lo rechaza entero, lo reintenta fila por fila. */
    private List<String> guardarBloque(List<Pendiente> bloque) {
        try {
            return registroLote.registrar(bloque.stream().map(Pendiente::request).toList());
        } catch (DataIntegrityViolationException e) {
            List<String> resultado = new ArrayList<>(bloque.size());
            for (Pendiente p : bloque) resultado.add(registrarUno(p.request()));
            return resultado;
        }
    }

    private String registrarUno(RegistrarEstudianteRequest request) {
        try {
            estudianteService.registrar(request);
            return null;
        } catch (EstudianteDuplicadoException | IllegalArgumentException e) {
            return e.getMessage();
        } catch (DataIntegrityViolationException e) {
            return "no se pudo guardar por una restricción de la base de datos.";
        }
    }

    private static int numeroDeFila(String error) {
        int fin = error.indexOf(':');
        try {
            return Integer.parseInt(error.substring("Fila ".length(), fin));
        } catch (RuntimeException e) {
            return Integer.MAX_VALUE;
        }
    }

    /** Solicitud de una fila válida, o el motivo (y la columna) por el que la fila no se importa. */
    private record Validacion(RegistrarEstudianteRequest request, String error, String columna) {
        static Validacion rechazo(String motivo) {
            return new Validacion(null, motivo, null);
        }

        static Validacion rechazo(String columna, String motivo) {
            return new Validacion(null, motivo, columna);
        }
    }

    /** Nombre de cada campo como lo ve el usuario (columna del error en la revisión). */
    private static final java.util.Map<String, String> COLUMNA_VISIBLE = java.util.Map.of(
        "codigoSis", "Código SIS", "nombre", "Nombres", "apellidos", "Apellidos", "ci", "CI", "email", "Correo",
        "telefono", "Teléfono", "idFacultad", "Facultad", "idCarrera", "Carrera", "estadoMatricula", "Matrícula");

    private Validacion validarFila(
        CSVRecord fila, Set<String> sisEnArchivo, Set<String> ciEnArchivo, Set<String> emailEnArchivo
    ) {
        if (!fila.isConsistent()) {
            return Validacion.rechazo("la cantidad de columnas no coincide con los encabezados.");
        }

        String idFacultadTexto = LecturaCsv.valor(fila, "idFacultad");
        String idCarreraTexto = LecturaCsv.valor(fila, "idCarrera");
        Integer idFacultad = aEntero(idFacultadTexto);
        Integer idCarrera = aEntero(idCarreraTexto);
        if (!idFacultadTexto.isEmpty() && idFacultad == null) {
            return Validacion.rechazo("Facultad", "idFacultad debe ser un número.");
        }
        if (!idCarreraTexto.isEmpty() && idCarrera == null) {
            return Validacion.rechazo("Carrera", "idCarrera debe ser un número.");
        }

        RegistrarEstudianteRequest request = new RegistrarEstudianteRequest(
            LecturaCsv.valor(fila, "nombre"),
            LecturaCsv.valor(fila, "apellidos"),
            LecturaCsv.valor(fila, "ci"),
            opcional(LecturaCsv.valor(fila, "telefono")),
            LecturaCsv.valor(fila, "email").toLowerCase(Locale.ROOT),
            LecturaCsv.valor(fila, "codigoSis"),
            idFacultad,
            idCarrera,
            null,
            opcional(LecturaCsv.valor(fila, "estadoMatricula"))
        );

        Set<ConstraintViolation<RegistrarEstudianteRequest>> violaciones = validator.validate(request);
        if (!violaciones.isEmpty()) {
            // La columna es la del primer error (en orden de las columnas del archivo).
            String columna = violaciones.stream().map(v -> v.getPropertyPath().toString())
                .min(Comparator.comparingInt(c -> COLUMNAS.indexOf(c) < 0 ? 99 : COLUMNAS.indexOf(c)))
                .map(c -> COLUMNA_VISIBLE.getOrDefault(c, c)).orElse(null);
            return Validacion.rechazo(columna, violaciones.stream()
                .map(ConstraintViolation::getMessage)
                .sorted()
                .collect(Collectors.joining("; ")) + ".");
        }

        if (!sisEnArchivo.add(request.codigoSis())) {
            return Validacion.rechazo("Código SIS", "el código SIS " + request.codigoSis() + " está repetido en el archivo.");
        }
        if (!ciEnArchivo.add(request.ci())) {
            return Validacion.rechazo("CI", "el CI " + request.ci() + " está repetido en el archivo.");
        }
        if (!emailEnArchivo.add(request.email())) {
            return Validacion.rechazo("Correo", "el correo " + request.email() + " está repetido en el archivo.");
        }

        return new Validacion(request, null, null);
    }

    private static Integer aEntero(String texto) {
        if (texto.isEmpty()) return null;
        try {
            return Integer.valueOf(texto);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Columna opcional vacía o ausente → null (se usa el valor por defecto). */
    private static String opcional(String valor) {
        return valor.isEmpty() ? null : valor;
    }
}
