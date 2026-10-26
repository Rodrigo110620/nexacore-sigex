package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

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
        LocalDateTime fechaHoraIngreso,
        /** INCI-01: lo expulsaron en la sesión actual del examen. */
        boolean expulsado,
        /** Hora oficial de la expulsión: su cronómetro se detiene ahí. null si no lo expulsaron. */
        LocalDateTime fechaHoraExpulsion,
        /** Normas del examen que valen para todos. */
        List<String> normasGenerales,
        /** Normas particulares (adaptaciones) de este estudiante; nunca las de otros. */
        List<String> normasParticulares
) {}
