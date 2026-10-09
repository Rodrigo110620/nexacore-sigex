package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ActualizarAforoRequest(
        @NotNull(message = "Indica el aforo del ambiente")
        @Positive(message = "El aforo debe ser mayor a cero")
        @Max(value = 1000, message = "El aforo no puede superar 1000")
        Integer capacidad
) {}
