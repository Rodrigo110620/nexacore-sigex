package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Datos para crear un nuevo rol en el sistema.
 * Solo letras y guiones bajos, en mayúsculas. Ej: SUPERVISOR, JEFE_CONTROL.
 */
public record CrearRolRequest(

        @NotBlank(message = "El nombre del rol es obligatorio")
        @Pattern(
                regexp = "^[A-Z_]+$",
                message = "El nombre debe estar en mayúsculas y solo puede contener letras y guiones bajos"
        )
        String nombre
) {}
