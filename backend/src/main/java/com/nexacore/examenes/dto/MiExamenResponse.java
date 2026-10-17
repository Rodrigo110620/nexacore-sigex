package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Examen del estudiante en su panel: datos, habilitación y resultado del ingreso. */
public record MiExamenResponse(
        Integer idExamen,
        String materia,
        LocalDate fecha,
        LocalTime horaInicio,
        Integer duracionMinutos,
        /** Aula donde debe presentarse, o null si se asigna al llegar. */
        String aula,
        /** true habilitado, false no habilitado, null pendiente de revisión. */
        Boolean habilitado,
        String motivoInhabilitacion,
        /** AUTORIZADO, DENEGADO o null si todavía no pasó por el control. */
        String resultadoIngreso,
        String motivoDenegacion,
        LocalDateTime fechaHoraIngreso
) {}
