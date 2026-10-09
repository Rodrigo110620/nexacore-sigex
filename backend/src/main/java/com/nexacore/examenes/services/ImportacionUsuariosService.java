package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ImportarUsuariosResponse;
import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.exceptions.CiDuplicadoException;
import com.nexacore.examenes.exceptions.CorreoNoEnviadoException;
import com.nexacore.examenes.exceptions.EmailDuplicadoException;
import com.nexacore.examenes.exceptions.RolInvalidoException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
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
 * Importación masiva de usuarios del sistema desde CSV.
 *
 * Cada fila pasa por las mismas validaciones que el registro individual y se guarda con
 * {@link UsuarioService#registrar}, en su propia transacción: una fila con error no revierte
 * las demás. Como en el registro individual, cada usuario recibe su contraseña temporal por correo.
 *
 * La columna estado es opcional (activo por defecto) y una columna id, como la que trae el CSV
 * exportado, se ignora: así el archivo exportado sirve de plantilla.
 */
@Service
public class ImportacionUsuariosService {

    static final List<String> COLUMNAS = List.of("nombre", "apellidos", "ci", "email", "rol");
    static final int MAX_FILAS = 500;

    private final UsuarioService usuarioService;
    private final Validator validator;

    public ImportacionUsuariosService(UsuarioService usuarioService, Validator validator) {
        this.usuarioService = usuarioService;
        this.validator = validator;
    }

    public ImportarUsuariosResponse importar(MultipartFile file) {
        String contenido = LecturaCsv.leerArchivo(file);

        int insertados = 0;
        int ignorados = 0;
        List<String> errores = new ArrayList<>();
        Set<String> emailEnArchivo = new HashSet<>();
        Set<String> ciEnArchivo = new HashSet<>();

        try (CSVParser parser = CSVParser.parse(contenido, LecturaCsv.formato(contenido))) {
            LecturaCsv.validarEncabezados(parser.getHeaderNames(), COLUMNAS);

            List<CSVRecord> filas = parser.getRecords();
            if (filas.isEmpty()) {
                throw new IllegalArgumentException("El archivo no tiene filas de usuarios.");
            }
            if (filas.size() > MAX_FILAS) {
                throw new IllegalArgumentException(
                    "El archivo supera el máximo de " + MAX_FILAS + " usuarios por importación.");
            }

            for (CSVRecord fila : filas) {
                // +1 por la fila de encabezados: coincide con la numeración de Excel.
                String prefijo = "Fila " + (fila.getRecordNumber() + 1) + ": ";
                String error = procesarFila(fila, emailEnArchivo, ciEnArchivo);
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

        return new ImportarUsuariosResponse(insertados, ignorados, errores);
    }

    /** Devuelve el motivo por el que la fila no se importó, o null si se registró. */
    private String procesarFila(CSVRecord fila, Set<String> emailEnArchivo, Set<String> ciEnArchivo) {
        if (!fila.isConsistent()) {
            return "la cantidad de columnas no coincide con los encabezados.";
        }

        String estado = LecturaCsv.valor(fila, "estado").toLowerCase(Locale.ROOT);
        if (!estado.isEmpty() && !estado.equals("activo") && !estado.equals("inactivo")) {
            return "el estado debe ser activo o inactivo.";
        }

        RegisterUserRequest request = new RegisterUserRequest(
            LecturaCsv.valor(fila, "nombre"),
            LecturaCsv.valor(fila, "apellidos"),
            LecturaCsv.valor(fila, "ci"),
            LecturaCsv.valor(fila, "email").toLowerCase(Locale.ROOT),
            LecturaCsv.valor(fila, "rol").toUpperCase(Locale.ROOT),
            !estado.equals("inactivo"),
            true
        );

        Set<ConstraintViolation<RegisterUserRequest>> violaciones = validator.validate(request);
        if (!violaciones.isEmpty()) {
            return violaciones.stream()
                .map(ConstraintViolation::getMessage)
                .sorted()
                .collect(Collectors.joining("; ")) + ".";
        }

        if (!emailEnArchivo.add(request.email())) {
            return "el correo " + request.email() + " está repetido en el archivo.";
        }
        if (!ciEnArchivo.add(request.ci())) {
            return "el CI " + request.ci() + " está repetido en el archivo.";
        }

        try {
            usuarioService.registrar(request);
            return null;
        } catch (EmailDuplicadoException | CiDuplicadoException | CorreoNoEnviadoException
                 | RolInvalidoException | IllegalArgumentException e) {
            return e.getMessage();
        } catch (DataIntegrityViolationException e) {
            return "no se pudo guardar por una restricción de la base de datos.";
        }
    }
}
