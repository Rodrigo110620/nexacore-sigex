package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Paso 2 de la activación (BUG-E03 de HU#5): comprobar el código antes de pedir la contraseña. */
public record VerificarCodigoActivacionRequest(
        @NotBlank(message = "El código SIS es obligatorio")
        @Pattern(regexp = "^\\s*\\d{9}\\s*$", message = "El código SIS debe tener 9 dígitos")
        String codigoSis,
        @NotBlank(message = "El código de verificación es obligatorio")
        @Pattern(regexp = "^\\s*\\d{6}\\s*$", message = "El código de verificación tiene 6 dígitos")
        String codigo
) {}
