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
        List<String> normasParticulares,
        /** INCI-03: aula original si lo trasladaron en la sesión actual; null si no. */
        String trasladadoDesde,
        /** Otros exámenes suyos que se cruzan en horario con este («Cálculo II, 08:00–10:00»); null si ninguno. */
        String cruceHorario
) {
    public MiExamenResponse(Integer idExamen, String materia, LocalDate fecha, LocalTime horaInicio, Integer duracionMinutos,
                            String aula, Boolean habilitado, String motivoInhabilitacion, String resultadoIngreso,
                            String motivoDenegacion, LocalDateTime fechaHoraIngreso, boolean expulsado,
                            LocalDateTime fechaHoraExpulsion, List<String> normasGenerales, List<String> normasParticulares,
                            String trasladadoDesde) {
        this(idExamen, materia, fecha, horaInicio, duracionMinutos, aula, habilitado, motivoInhabilitacion, resultadoIngreso,
                motivoDenegacion, fechaHoraIngreso, expulsado, fechaHoraExpulsion, normasGenerales, normasParticulares,
                trasladadoDesde, null);
    }

    /** El mismo examen con el aviso de cruce de horario. */
    public MiExamenResponse conCruce(String cruce) {
        return new MiExamenResponse(idExamen, materia, fecha, horaInicio, duracionMinutos, aula, habilitado,
                motivoInhabilitacion, resultadoIngreso, motivoDenegacion, fechaHoraIngreso, expulsado, fechaHoraExpulsion,
                normasGenerales, normasParticulares, trasladadoDesde, cruce);
    }
}
