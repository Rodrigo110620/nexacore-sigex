package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Registro auditable de autorización o denegación para la vista general de un examen. */
public record RegistroControlIngresoExamenResponse(
        Integer idRegistro,
        Integer idEstudiante,
        String estudiante,
        String codigoSis,
        String resultado,
        String causa,
        String observaciones,
        List<String> verificacionesAdicionales,
        String usuarioControl,
        LocalDateTime fechaHora
) {}
