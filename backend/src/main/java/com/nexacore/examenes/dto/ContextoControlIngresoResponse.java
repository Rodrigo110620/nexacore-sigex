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
        String carrera,
        /** REGULAR o POSTULANTE. */
        String condicion,
        /** Ruta de la API para descargar la foto, o null si no tiene. */
        String fotoUrl,
        /** Hora de salida registrada (V56); null si no salió. */
        LocalDateTime fechaHoraSalida,
        /** Expulsado en la sesión actual (no se le registra salida). */
        boolean expulsado
) {
    public ContextoControlIngresoResponse(Integer idEstudiante, String estudiante, String codigoSis, String documento,
            Integer idExamen, String asignatura, LocalDate fecha, LocalTime horaInicio, Integer duracionMinutos,
            String ambiente, List<String> normasGenerales, List<String> normasParticulares, boolean habilitado,
            String motivoInhabilitacion, boolean ingresoRegistrado, LocalDateTime fechaHoraIngreso, String carrera,
            String condicion, String fotoUrl) {
        this(idEstudiante, estudiante, codigoSis, documento, idExamen, asignatura, fecha, horaInicio, duracionMinutos,
                ambiente, normasGenerales, normasParticulares, habilitado, motivoInhabilitacion, ingresoRegistrado,
                fechaHoraIngreso, carrera, condicion, fotoUrl, null, false);
    }
}
