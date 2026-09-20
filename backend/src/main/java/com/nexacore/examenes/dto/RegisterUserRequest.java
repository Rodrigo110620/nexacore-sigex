package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Datos para registrar o actualizar un usuario del sistema (HU#2).
 *
 * El admin NO envía contraseña: el sistema genera una clave provisional
 * y la envía solo por correo al usuario. No se expone en la respuesta HTTP.
 * El rol debe existir en la tabla rol.
 */
public record RegisterUserRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
        @Pattern(
                regexp = "^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+(?:[ '\\-][A-Za-záéíóúÁÉÍÓÚüÜñÑ]+)*$",
                message = "El nombre solo puede contener letras (sin numeros ni simbolos)"
        )
        String nombre,

        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(min = 2, max = 80, message = "Los apellidos deben tener entre 2 y 80 caracteres")
        @Pattern(
                regexp = "^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+(?:[ '\\-][A-Za-záéíóúÁÉÍÓÚüÜñÑ]+)*$",
                message = "Los apellidos solo pueden contener letras (sin numeros ni simbolos)"
        )
        String apellidos,

        @NotBlank(message = "El CI/DNI es obligatorio")
        @Size(min = 7, max = 8, message = "El CI/DNI debe tener 7 u 8 digitos")
        @Pattern(regexp = "^\\d{7,8}$", message = "El CI/DNI debe contener solo digitos")
        String ci,

        @NotBlank(message = "El correo electronico es obligatorio")
        @Email(message = "El formato del correo electronico no es valido")
        @Size(max = 100, message = "El correo no puede superar 100 caracteres")
        String email,

        @NotBlank(message = "El rol es obligatorio")
        @Size(max = 30, message = "El rol no puede superar 30 caracteres")
        String rol,

        @NotNull(message = "El estado activo es obligatorio")
        Boolean activo,

        /** Si true, se envía la contraseña temporal por correo. Null se trata como false. */
        Boolean notificarEmail
) {}
