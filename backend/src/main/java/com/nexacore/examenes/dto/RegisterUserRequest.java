package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Datos para registrar un nuevo usuario del sistema (HU#2).
 *
 * El admin NO envía contraseña: el sistema genera una clave provisional
 * y la envía solo por correo al usuario. No se expone en la respuesta HTTP.
 * El rol debe existir en la tabla rol.
 */
public record RegisterUserRequest(

        @NotBlank(message = "El nombre es obligatorio")
        String nombre,

        @NotBlank(message = "Los apellidos son obligatorios")
        String apellidos,

        @NotBlank(message = "El CI/DNI es obligatorio")
        String ci,

        @NotBlank(message = "El correo electronico es obligatorio")
        @Email(message = "El formato del correo electronico no es valido")
        String email,

        @NotBlank(message = "El rol es obligatorio")
        String rol,

        @NotNull(message = "El estado activo es obligatorio")
        Boolean activo,

        /** Si true, se envía la contraseña temporal por correo. Null se trata como false. */
        Boolean notificarEmail
) {}
