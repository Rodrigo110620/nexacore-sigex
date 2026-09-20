package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Solicitud pública para establecer una nueva contraseña con token de reset.
 */
public record ResetPasswordRequest(

        @NotBlank(message = "El token es obligatorio")
        String token,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 6, max = 72, message = "La nueva contraseña debe tener entre 6 y 72 caracteres")
        String passwordNueva,

        @NotBlank(message = "La confirmación de contraseña es obligatoria")
        String passwordConfirmacion
) {}
