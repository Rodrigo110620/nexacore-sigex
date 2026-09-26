package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CrearAmbienteRequest(
        @NotBlank(message = "El nombre del ambiente es obligatorio")
        @Size(max = 120, message = "Máximo 120 caracteres")
        String nombre,

        @Size(max = 200, message = "Máximo 200 caracteres")
        String ubicacion
) {}
