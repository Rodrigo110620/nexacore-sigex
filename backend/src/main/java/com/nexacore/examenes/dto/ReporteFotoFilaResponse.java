package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Una fila del reporte de fotos reportadas. estado: PENDIENTE, APROBADA (foto nueva) o DESCARTADO (la foto estaba bien). */
public record ReporteFotoFilaResponse(
        Integer idReporte,
        Integer idExamen,
        String examen,
        Integer idEstudiante,
        String estudiante,
        String codigoSis,
        String motivo,
        String detalle,
        String reportadoPor,
        LocalDateTime reportadoEn,
        String estado,
        LocalDateTime resueltoEn) {}
