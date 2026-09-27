package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RegistroControlIngresoResponse(
        Integer idRegistro,
        Integer idEstudiante,
        Integer idExamen,
        String resultado,
        String causa,
        String observaciones,
        List<String> verificacionesAdicionales,
        String usuarioControl,
        LocalDateTime fechaHora
) {
}
