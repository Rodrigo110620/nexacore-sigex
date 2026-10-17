package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Paso 1 de la activación de la cuenta del estudiante: verificar su identidad. */
public record SolicitarActivacionRequest(
        @NotBlank(message = "El código SIS es obligatorio")
        @Pattern(regexp = "^\\s*\\d{9}\\s*$", message = "El código SIS debe tener 9 dígitos")
        String codigoSis,
        @NotBlank(message = "El CI es obligatorio")
        @Pattern(regexp = "^\\s*\\d{7,8}\\s*$", message = "El CI debe tener 7 u 8 dígitos")
        String ci,
        @NotBlank(message = "El correo institucional es obligatorio")
        @Size(max = 100, message = "El correo no puede superar 100 caracteres")
        String email
) {}
