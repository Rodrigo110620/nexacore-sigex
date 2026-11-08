package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AutorizarIngresoResponse(
        boolean autorizado,
        String resultado,
        String causa,
        Integer idEstudiante,
        Integer idExamen,
        String estudiante,
        String codigoSis,
        String examen,
        String ambiente,
        String normas,
        String autorizadoPor,
        LocalDateTime fechaHoraIngreso,
        String observaciones,
        List<String> verificacionesAdicionales,
        int incidenciasRegistradas,
        /** DASH-03: aviso si el aula quedó llena o casi llena con este ingreso; null si hay lugar. */
        String avisoAforo
) {
    public AutorizarIngresoResponse(boolean autorizado, String resultado, String causa, Integer idEstudiante, Integer idExamen,
                                    String estudiante, String codigoSis, String examen, String ambiente, String normas,
                                    String autorizadoPor, LocalDateTime fechaHoraIngreso, String observaciones,
                                    List<String> verificacionesAdicionales, int incidenciasRegistradas) {
        this(autorizado, resultado, causa, idEstudiante, idExamen, estudiante, codigoSis, examen, ambiente, normas,
                autorizadoPor, fechaHoraIngreso, observaciones, verificacionesAdicionales, incidenciasRegistradas, null);
    }
}
