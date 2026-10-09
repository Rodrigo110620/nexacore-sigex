package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CrearAmbienteRequest(
        @NotBlank(message = "El nombre del ambiente es obligatorio")
        @Pattern(regexp = "^\\s*[A-Za-z0-9]{2,20}\\s*$",
                message = "Solo letras y números, entre 2 y 20 caracteres")
        String nombre,

        @Size(max = 200, message = "Máximo 200 caracteres")
        String ubicacion,

        @Positive(message = "El aforo debe ser mayor a cero")
        Integer capacidad,

        @Size(max = 60, message = "Máximo 60 caracteres")
        String pabellon
) {}
