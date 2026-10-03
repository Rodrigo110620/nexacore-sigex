package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ActualizarEstudianteRequest(
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 3, max = 30, message = "El nombre debe tener entre 3 y 30 caracteres")
    String nombre,

    @NotBlank(message = "Los apellidos son obligatorios")
    @Size(min = 4, max = 40, message = "Los apellidos deben tener entre 4 y 40 caracteres")
    String apellidos,

    @NotBlank(message = "El código SIS es obligatorio")
    @Size(min = 7, max = 9, message = "El código SIS debe tener entre 7 y 9 dígitos")
    String codigoSis,

    @NotBlank(message = "El documento es obligatorio")
    @Size(min = 7, max = 8, message = "El documento debe tener 7 u 8 dígitos")
    String ci,

    @Email(message = "Formato de correo inválido")
    @Size(min = 5, max = 50, message = "El correo debe tener entre 5 y 50 caracteres")
    String email,

    @NotNull(message = "La facultad es obligatoria")
    Integer idFacultad,

    @NotNull(message = "La carrera es obligatoria")
    Integer idCarrera
) {}