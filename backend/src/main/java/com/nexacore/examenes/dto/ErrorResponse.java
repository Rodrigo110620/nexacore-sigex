package com.nexacore.examenes.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Formato unico de error para toda la API.
 *
 * "errores" solo aparece en el JSON cuando hay fallos de validacion
 * (400), gracias a JsonInclude.NON_EMPTY. Asi el frontend puede
 * pintar el mensaje debajo de cada campo del formulario.
 *
 * Tarea B4 - Sprint 1.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(
        int estado,
        String mensaje,
        LocalDateTime fecha,
        Map<String, String> errores
) {
    public ErrorResponse(int estado, String mensaje) {
        this(estado, mensaje, LocalDateTime.now(), Map.of());
    }

    public ErrorResponse(int estado, String mensaje, Map<String, String> errores) {
        this(estado, mensaje, LocalDateTime.now(), errores);
    }
}
