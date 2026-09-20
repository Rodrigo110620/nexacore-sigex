package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Datos que envia el formulario de login (HU AUTH-02).
 *
 * Se valida con Jakarta Validation: si algun campo falla,
 * el GlobalExceptionHandler responde 400 Bad Request.
 *
 * Es un record de Java 17: inmutable y sin codigo repetitivo.
 *
 * Tarea B4 - Sprint 1.
 */
public record LoginRequest(

        @NotBlank(message = "El correo electronico es obligatorio")
        @Email(message = "El formato del correo electronico no es valido")
        String email,

        @NotBlank(message = "La contrasena es obligatoria")
        String password
) {
}
