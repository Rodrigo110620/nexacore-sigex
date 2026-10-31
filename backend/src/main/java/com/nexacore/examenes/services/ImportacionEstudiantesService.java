package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ImportarEstudiantesResponse;
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

    public ImportarEstudiantesResponse importar(MultipartFile file) {
        String contenido = LecturaCsv.leerArchivo(file);
        CSVFormat formato = LecturaCsv.formato(contenido);

        int insertados = 0;
        int ignorados = 0;
        List<String> errores = new ArrayList<>();
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
                String prefijo = "Fila " + (fila.getRecordNumber() + 1) + ": ";
                Validacion validacion = validarFila(fila, sisEnArchivo, ciEnArchivo, emailEnArchivo);
                if (validacion.error() == null) {
                    pendientes.add(new Pendiente(prefijo, validacion.request()));
                } else {
                    ignorados++;
                    errores.add(prefijo + validacion.error());
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo CSV.");
        } catch (UncheckedIOException e) {
            throw new IllegalArgumentException("El archivo CSV tiene un formato inválido.");
        }

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
        }
        // Los errores se informan en el orden de las filas del archivo.
        errores.addAll(erroresAlGuardar);
        errores.sort(Comparator.comparingInt(ImportacionEstudiantesService::numeroDeFila));
        return new ImportarEstudiantesResponse(insertados, ignorados, errores);
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

    /** Solicitud de una fila válida, o el motivo por el que la fila no se importa. */
    private record Validacion(RegistrarEstudianteRequest request, String error) {
        static Validacion rechazo(String motivo) {
            return new Validacion(null, motivo);
        }
    }

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
            return Validacion.rechazo("idFacultad debe ser un número.");
        }
        if (!idCarreraTexto.isEmpty() && idCarrera == null) {
            return Validacion.rechazo("idCarrera debe ser un número.");
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
            return Validacion.rechazo(violaciones.stream()
                .map(ConstraintViolation::getMessage)
                .sorted()
                .collect(Collectors.joining("; ")) + ".");
        }

        if (!sisEnArchivo.add(request.codigoSis())) {
            return Validacion.rechazo("el código SIS " + request.codigoSis() + " está repetido en el archivo.");
        }
        if (!ciEnArchivo.add(request.ci())) {
            return Validacion.rechazo("el CI " + request.ci() + " está repetido en el archivo.");
        }
        if (!emailEnArchivo.add(request.email())) {
            return Validacion.rechazo("el correo " + request.email() + " está repetido en el archivo.");
        }

        return new Validacion(request, null);
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
