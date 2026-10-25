package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Notificación para la campana del personal (y el evento en vivo). */
public record NotificacionResponse(
        Integer id,
        String tipo,
        String titulo,
        String detalle,
        Integer idExamen,
        Integer idEstudiante,
        String enlace,
        LocalDateTime creadaEn,
        boolean leida
) {}
