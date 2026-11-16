package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Paso 3 de la activación: el código recibido por correo, la contraseña nueva y, si la administración
 * no lo registró, el C.I. del estudiante.
 */
public record ConfirmarActivacionRequest(
        @NotBlank(message = "El código SIS es obligatorio")
        @Pattern(regexp = "^\\s*\\d{9}\\s*$", message = "El código SIS debe tener 9 dígitos")
        String codigoSis,
        @NotBlank(message = "El código de verificación es obligatorio")
        @Pattern(regexp = "^\\s*\\d{6}\\s*$", message = "El código de verificación tiene 6 dígitos")
        String codigo,
        @NotBlank(message = "La contraseña es obligatoria")
        String passwordNueva,
        @NotBlank(message = "Confirma la contraseña")
        String passwordConfirmacion,
        @Pattern(regexp = ReglasEstudiante.CI_OPCIONAL, message = ReglasEstudiante.MSG_CI)
        String ci
) {
    public ConfirmarActivacionRequest(String codigoSis, String codigo, String passwordNueva, String passwordConfirmacion) {
        this(codigoSis, codigo, passwordNueva, passwordConfirmacion, null);
    }
}
