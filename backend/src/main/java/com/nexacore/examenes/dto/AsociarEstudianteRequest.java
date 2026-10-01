package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;

/** identificador es el código universitario o el CI del estudiante. */
public record AsociarEstudianteRequest(
        @NotBlank(message = "Ingrese el código universitario o el CI del estudiante")
        String identificador
) {}
