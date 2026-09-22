package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Solicitud para cambiar la contraseña del usuario autenticado.
 */
public record CambiarPasswordRequest(

        @NotBlank(message = "La contraseña actual es obligatoria")
        String passwordActual,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres")
        String passwordNueva,

        @NotBlank(message = "La confirmación de contraseña es obligatoria")
        String passwordConfirmacion
) {}
