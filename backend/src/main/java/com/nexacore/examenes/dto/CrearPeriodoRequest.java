package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record CrearPeriodoRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Pattern(regexp = "^\\s*(?i:I|II|VERANO|INVIERNO)-\\d{4}\\s*$",
                message = "Usa el formato I-2027, II-2027, VERANO-2027 o INVIERNO-2027")
        String nombre,
        @NotNull(message = "La fecha de inicio es obligatoria") LocalDate fechaInicio,
        @NotNull(message = "La fecha de fin es obligatoria") LocalDate fechaFin,
        boolean activar
) {}
