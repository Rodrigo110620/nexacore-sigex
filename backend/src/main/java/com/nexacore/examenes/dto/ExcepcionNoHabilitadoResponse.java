package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** INCI-04: una excepción de no habilitado en el reporte del examen (sesión actual). */
public record ExcepcionNoHabilitadoResponse(
        Integer idExcepcion,
        Integer idEstudiante,
        String estudiante,
        String codigoSis,
        String motivoInhabilitacion,
        String accionTomada,
        String observaciones,
        String ambiente,
        String registradoPor,
        /** Hora del servidor en que se registró. */
        LocalDateTime fechaHora,
        /** El examen (en el reporte de «Todos los exámenes» cada fila dice de cuál es). */
        Integer idExamen
) {
    public ExcepcionNoHabilitadoResponse(Integer idExcepcion, Integer idEstudiante, String estudiante, String codigoSis,
                                         String motivoInhabilitacion, String accionTomada, String observaciones, String ambiente,
                                         String registradoPor, LocalDateTime fechaHora) {
        this(idExcepcion, idEstudiante, estudiante, codigoSis, motivoInhabilitacion, accionTomada, observaciones, ambiente,
                registradoPor, fechaHora, null);
    }
}
