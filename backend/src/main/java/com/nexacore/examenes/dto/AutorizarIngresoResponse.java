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
        int incidenciasRegistradas
) {
}
