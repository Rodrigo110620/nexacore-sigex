package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Paso 1 de la activación de la cuenta del estudiante: pedir el código a su correo institucional.
 * Basta el código SIS: el código llega a código SIS @est.umss.edu, que solo el estudiante puede leer.
 * C.I. y correo son opcionales (pantallas anteriores los enviaban); si vienen, deben coincidir.
 */
public record SolicitarActivacionRequest(
        @NotBlank(message = "El código SIS es obligatorio")
        @Pattern(regexp = "^\\s*\\d{9}\\s*$", message = "El código SIS debe tener 9 dígitos")
        String codigoSis,
        @Pattern(regexp = ReglasEstudiante.CI_OPCIONAL, message = "El CI debe tener 7 u 8 dígitos")
        String ci,
        @Size(max = 100, message = "El correo no puede superar 100 caracteres")
        String email
) {
    public SolicitarActivacionRequest(String codigoSis) {
        this(codigoSis, null, null);
    }
}
