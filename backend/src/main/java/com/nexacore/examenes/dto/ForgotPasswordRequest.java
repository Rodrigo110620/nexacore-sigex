package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Solicitud pública para iniciar el restablecimiento de contraseña.
 */
public record ForgotPasswordRequest(

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Formato de correo inválido")
        @Pattern(
                regexp = "(?i)^[A-Za-z0-9._%+-]+@est\\.umss\\.edu(\\.bo)?$",
                message = "Solo se permiten correos @est.umss.edu"
        )
        String email
) {}
