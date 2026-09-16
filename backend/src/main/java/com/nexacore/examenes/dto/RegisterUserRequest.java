package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Datos para registrar un nuevo usuario del sistema (HU#2).
 *
 * Todos los campos son obligatorios. El rol debe ser uno de:
 * ADMIN, DOCENTE o CONTROL (se valida en UsuarioService).
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
        String rol
) {}
