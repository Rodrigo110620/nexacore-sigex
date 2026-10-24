package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** identificador es el código universitario o el CI del estudiante. */
public record AsociarEstudianteRequest(
        @NotBlank(message = "Ingrese el código universitario o el CI del estudiante")
        @Pattern(regexp = ReglasEstudiante.IDENTIFICADOR, message = ReglasEstudiante.MSG_IDENTIFICADOR)
        String identificador
) {}
