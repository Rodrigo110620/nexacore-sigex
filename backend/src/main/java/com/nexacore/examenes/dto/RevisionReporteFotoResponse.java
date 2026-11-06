package com.nexacore.examenes.dto;

/**
 * El reporte abierto de una foto, para revisarlo desde el aviso o desde Reportes: la misma solicitud que ve el ADMIN
 * en Revisión de fotos, de qué examen es y si quien consulta puede resolverlo.
 */
public record RevisionReporteFotoResponse(
        Integer idExamen,
        String examen,
        boolean puedeRevisar,
        FotoPendienteResponse solicitud) {}
