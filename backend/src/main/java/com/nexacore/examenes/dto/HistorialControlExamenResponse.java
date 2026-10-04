package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

public record HistorialControlExamenResponse(
        Integer idRegistro,
        Integer idEstudiante,
        String estudiante,
        String identificador,
        String resultado,
        String causa,
        String observaciones,
        String usuarioControl,
        LocalDateTime fechaHora
) {}
