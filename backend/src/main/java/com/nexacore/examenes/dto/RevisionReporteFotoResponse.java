package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/**
 * El reporte abierto de una foto, para revisarlo desde el aviso: de qué examen es, si el estudiante ya envió la
 * foto nueva y si quien consulta puede resolverlo.
 */
public record RevisionReporteFotoResponse(
        Integer idExamen,
        String examen,
        String motivo,
        String detalle,
        String reportadoPor,
        LocalDateTime reportadoEn,
        /** Ruta de la foto nueva enviada por el estudiante; null si aún no la envió. */
        String fotoNuevaUrl,
        boolean puedeRevisar) {}
