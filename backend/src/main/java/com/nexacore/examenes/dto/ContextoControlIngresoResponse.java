package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ContextoControlIngresoResponse(
        Integer idEstudiante,
        String estudiante,
        String codigoSis,
        String documento,
        Integer idExamen,
        String asignatura,
        LocalDate fecha,
        LocalTime horaInicio,
        Integer duracionMinutos,
        String ambiente,
        List<String> normasGenerales,
        List<String> normasParticulares,
        boolean habilitado,
        String motivoInhabilitacion,
        boolean ingresoRegistrado,
        LocalDateTime fechaHoraIngreso,
        String carrera
) {
}
