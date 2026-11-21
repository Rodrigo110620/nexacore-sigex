package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

public record ReporteModificacionInhabilitadoResponse(
    Integer idAuditoria,
    Integer idExamen,
    String examen,
    String estudiante,
    String codigoSis,
    String docente,
    String accion,
    String estadoAnterior,
    boolean esFallo,
    String motivoFallo,
    LocalDateTime fechaHora
) {}