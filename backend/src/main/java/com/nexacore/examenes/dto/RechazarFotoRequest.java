package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RechazarFotoRequest(
        @NotBlank(message = "Indica el motivo del rechazo")
        @Size(min = 5, max = 200, message = "El motivo debe tener entre 5 y 200 caracteres")
        String motivo
) {}
