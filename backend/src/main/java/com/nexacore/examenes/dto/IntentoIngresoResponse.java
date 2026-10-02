package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Registro auditable de un intento de ingreso a un examen no asignado. */
public record IntentoIngresoResponse(
        Integer idIntento, Integer idExamen, Integer idEstudiante,
        String estudiante, String codigoSis, String identificador,
        String motivo, String personalControl, LocalDateTime fechaHora
) {}
