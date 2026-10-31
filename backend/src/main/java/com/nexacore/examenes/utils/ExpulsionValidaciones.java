package com.nexacore.examenes.utils;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Objects;
import java.util.Locale;

import static org.springframework.http.HttpStatus.*;

/** Reglas sin acceso a BD. No registran expulsiones ni sustituyen la transacción futura. */
public final class ExpulsionValidaciones {
    private ExpulsionValidaciones() {
    }

    public static String responsableAutenticado(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ControlIngresoException(UNAUTHORIZED, "Se requiere una sesión autenticada");
        }
        // Que el docente sea el de ese examen lo verifica la ruta (ExamenAccesoService.puedeExpulsar).
        boolean puede = com.nexacore.examenes.security.Permisos.alguno(authentication,
                com.nexacore.examenes.security.Permiso.EXPULSAR_TODOS, com.nexacore.examenes.security.Permiso.EXPULSAR_PROPIOS);
        if (!puede) throw new ControlIngresoException(FORBIDDEN, "Solo el administrador o el docente del examen puede expulsar estudiantes");
        return authentication.getName();
    }

    public static String motivo(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("El motivo de expulsión es obligatorio");
        }
        String texto = ValidacionTextoLibre.validarOpcional(
                motivo, "El motivo de expulsión", ExpulsarEstudianteRequest.MOTIVO_MIN, ExpulsarEstudianteRequest.MOTIVO_MAX);
        if (texto.contains("  ") || texto.contains("\n") || texto.contains("\r")) {
            throw new IllegalArgumentException("El motivo solo permite un espacio entre palabras");
        }
        if (texto.codePoints().noneMatch(Character::isLetter)) {
            throw new IllegalArgumentException("El motivo debe contener palabras que expliquen la expulsión");
        }
        String garabato = ValidacionPalabras.primerGarabato(texto.replaceAll("(?i)\\b(?:qr|ci|sis)\\b", "documento"));
        if (garabato != null) {
            throw new IllegalArgumentException("El motivo contiene contenido no válido: " + garabato);
        }
        String minusculas = texto.toLowerCase(Locale.forLanguageTag("es"));
        for (int i = 0; i < minusculas.length(); i++) {
            if (Character.isLetter(minusculas.charAt(i))) {
                return minusculas.substring(0, i) + Character.toUpperCase(minusculas.charAt(i)) + minusculas.substring(i + 1);
            }
        }
        return minusculas;
    }

    /** Motivo de la anulación (expulsión registrada por error): obligatorio, de 10 a 200 caracteres. */
    public static String motivoAnulacion(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("Indica por qué se anula la expulsión");
        }
        return ValidacionTextoLibre.validarOpcional(motivo, "El motivo de la anulación", 10, 200);
    }

    public static void asistencia(ExpulsarEstudianteRequest request, AsistenciaExamen asistencia) {
        if (asistencia == null || asistencia.getId() == null
                || !Objects.equals(request.idEstudiante(), asistencia.getId().getIdEstudiante())
                || !Objects.equals(request.idExamen(), asistencia.getId().getIdExamen())) {
            throw new ControlIngresoException(NOT_FOUND, "El estudiante no está asociado al examen seleccionado");
        }
        if (asistencia.getFechaHoraIngreso() == null) {
            throw new ControlIngresoException(CONFLICT, "El estudiante todavía no tiene un ingreso registrado");
        }
    }
}
