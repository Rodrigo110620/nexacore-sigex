package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** INCI-01: la identidad y la hora oficial nunca forman parte de la petición. */
public record ExpulsarEstudianteRequest(
        @NotNull @Positive Integer idEstudiante,
        @NotNull @Positive Integer idExamen,
        @NotBlank @Size(min = ExpulsarEstudianteRequest.MOTIVO_MIN, max = ExpulsarEstudianteRequest.MOTIVO_MAX) String motivo
) {
    public static final int MOTIVO_MIN = 10;
    public static final int MOTIVO_MAX = 65;
}
