package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;

public record NormaParticularRequest(
        @NotBlank(message = "El estudiante es obligatorio")
        String estudiante,

        @NotBlank(message = "El texto de la norma es obligatorio")
        String texto
) {}
