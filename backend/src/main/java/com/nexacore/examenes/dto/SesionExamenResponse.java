package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Sesión anterior de un examen reprogramado, con el resultado de cada estudiante. */
public record SesionExamenResponse(
        int numero,
        LocalDate fecha,
        LocalTime horaInicio,
        int duracionMinutos,
        String ambiente,
        int asociados,
        int ingresaron,
        String motivoReprogramacion,
        String reprogramadoPor,
        LocalDateTime cerradaEn,
        List<Estudiante> estudiantes
) {
    public record Estudiante(Integer idEstudiante, String codigoSis, String nombre, Boolean habilitado,
                             String motivoInhabilitacion, LocalDateTime fechaHoraIngreso, String aulaIngreso) {}
}
