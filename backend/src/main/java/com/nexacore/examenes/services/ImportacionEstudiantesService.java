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
import java.util.stream.Collectors;

/**
 * Importación masiva de estudiantes desde CSV.
 *
 * Cada fila pasa por las mismas validaciones que el registro individual
 * y se guarda con {@link EstudianteService#registrar}, en su propia
 * transacción: una fila con error no revierte las demás.
 */
@Service
public class ImportacionEstudiantesService {

    static final List<String> COLUMNAS = List.of(
        "codigoSis", "nombre", "apellidos", "ci", "email", "idFacultad", "idCarrera"
    );
    static final int MAX_FILAS = 2000;

    private final EstudianteService estudianteService;
    private final Validator validator;

    public ImportacionEstudiantesService(EstudianteService estudianteService, Validator validator) {
        this.estudianteService = estudianteService;
        this.validator = validator;
    }

    public ImportarEstudiantesResponse importar(MultipartFile file) {
        String contenido = LecturaCsv.leerArchivo(file);
        CSVFormat formato = LecturaCsv.formato(contenido);

        int insertados = 0;
        int ignorados = 0;
        List<String> errores = new ArrayList<>();
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
                String error = procesarFila(fila, sisEnArchivo, ciEnArchivo, emailEnArchivo);
                if (error == null) {
                    insertados++;
                } else {
                    ignorados++;
                    errores.add(prefijo + error);
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo CSV.");
        } catch (UncheckedIOException e) {
            throw new IllegalArgumentException("El archivo CSV tiene un formato inválido.");
        }

        return new ImportarEstudiantesResponse(insertados, ignorados, errores);
    }

    /** Devuelve el motivo por el que la fila no se importó, o null si se registró. */
    private String procesarFila(
        CSVRecord fila, Set<String> sisEnArchivo, Set<String> ciEnArchivo, Set<String> emailEnArchivo
    ) {
        if (!fila.isConsistent()) {
            return "la cantidad de columnas no coincide con los encabezados.";
        }

        String idFacultadTexto = LecturaCsv.valor(fila, "idFacultad");
        String idCarreraTexto = LecturaCsv.valor(fila, "idCarrera");
        Integer idFacultad = aEntero(idFacultadTexto);
        Integer idCarrera = aEntero(idCarreraTexto);
        if (!idFacultadTexto.isEmpty() && idFacultad == null) {
            return "idFacultad debe ser un número.";
        }
        if (!idCarreraTexto.isEmpty() && idCarrera == null) {
            return "idCarrera debe ser un número.";
        }

        RegistrarEstudianteRequest request = new RegistrarEstudianteRequest(
            LecturaCsv.valor(fila, "nombre"),
            LecturaCsv.valor(fila, "apellidos"),
            LecturaCsv.valor(fila, "ci"),
            LecturaCsv.valor(fila, "email").toLowerCase(Locale.ROOT),
            LecturaCsv.valor(fila, "codigoSis"),
            idFacultad,
            idCarrera
        );

        Set<ConstraintViolation<RegistrarEstudianteRequest>> violaciones = validator.validate(request);
        if (!violaciones.isEmpty()) {
            return violaciones.stream()
                .map(ConstraintViolation::getMessage)
                .sorted()
                .collect(Collectors.joining("; ")) + ".";
        }

        if (!sisEnArchivo.add(request.codigoSis())) {
            return "el código SIS " + request.codigoSis() + " está repetido en el archivo.";
        }
        if (!ciEnArchivo.add(request.ci())) {
            return "el CI " + request.ci() + " está repetido en el archivo.";
        }
        if (!emailEnArchivo.add(request.email())) {
            return "el correo " + request.email() + " está repetido en el archivo.";
        }

        try {
            estudianteService.registrar(request);
            return null;
        } catch (EstudianteDuplicadoException | IllegalArgumentException e) {
            return e.getMessage();
        } catch (DataIntegrityViolationException e) {
            return "no se pudo guardar por una restricción de la base de datos.";
        }
    }

    private static Integer aEntero(String texto) {
        if (texto.isEmpty()) return null;
        try {
            return Integer.valueOf(texto);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
