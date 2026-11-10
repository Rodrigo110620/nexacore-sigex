package com.nexacore.examenes.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

/** Una operación auditada, presentada para la consulta administrativa. */
public record HistorialOperacionResponse(
        Integer id,
        LocalDateTime fechaHora,
        Integer idUsuario,
        String usuario,
        String rolUsuario,
        String email,
        String modulo,
        String operacion,
        String accion,
        String detalle,
        JsonNode cambios) {}
