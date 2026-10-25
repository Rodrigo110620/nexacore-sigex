package com.nexacore.examenes.utils;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Objects;

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
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(rol -> "ROLE_ADMIN".equals(rol.getAuthority()));
        if (!admin) throw new ControlIngresoException(FORBIDDEN, "Solo ADMIN puede expulsar estudiantes");
        return authentication.getName();
    }

    public static String motivo(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("El motivo de expulsión es obligatorio");
        }
        return ValidacionTextoLibre.validarOpcional(
                motivo, "El motivo de expulsión", 1, ExpulsarEstudianteRequest.MOTIVO_MAX);
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
