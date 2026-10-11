package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.nexacore.examenes.models.CondicionEstudiante;

public record RegistrarEstudianteRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
        @Pattern(
                regexp = "^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]{2,}(?:[ '\\-][A-Za-záéíóúÁÉÍÓÚüÜñÑ]{2,})*$",
                message = "El nombre solo puede contener letras; cada palabra minimo 2 letras"
        )
        String nombre,
        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(min = 2, max = 80, message = "Los apellidos deben tener entre 2 y 80 caracteres")
        @Pattern(
                regexp = "^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]{2,}(?:[ '\\-][A-Za-záéíóúÁÉÍÓÚüÜñÑ]{2,})*$",
                message = "Los apellidos solo pueden contener letras; cada palabra minimo 2 letras"
        )
        String apellidos,
        @NotBlank(message = "El CI es obligatorio")
        @Size(min = 7, max = 8, message = "El CI debe tener 7 u 8 digitos")
        @Pattern(regexp = "^\\d{7,8}$", message = "El CI debe contener solo digitos")
        String ci,
        @NotBlank(message = "El correo electrónico es obligatorio")
        @Email(message = "El formato del correo electronico no es valido")
        @Pattern(
                regexp = "(?i)^(?!([A-Za-z0-9_])\\1+@)[A-Za-z0-9._%+-]{3,}@(est\\.)?umss\\.edu(\\.bo)?$",
                message = "Use un correo institucional UMSS con al menos 3 caracteres antes de @; no se aceptan caracteres repetidos"
        )
        @Size(max = 100, message = "El correo no puede superar 100 caracteres")
        String email,
        @NotBlank(message = "El código SIS es obligatorio")
        @Size(min = 9, max = 9, message = "El código SIS debe tener 9 digitos")
        @Pattern(regexp = "^\\d{9}$", message = "El código SIS debe contener solo digitos")
        String codigoSis,
        @NotNull(message = "La facultad es obligatoria")
        Integer idFacultad,
        @NotNull(message = "La carrera es obligatoria")
        Integer idCarrera,
        /** Opcional: REGULAR (por defecto) o POSTULANTE. */
        @Pattern(regexp = CondicionEstudiante.PATRON, message = "La condición debe ser Regular o Postulante")
        String condicion
) {
    public RegistrarEstudianteRequest(String nombre, String apellidos, String ci, String email, String codigoSis,
                                      Integer idFacultad, Integer idCarrera) {
        this(nombre, apellidos, ci, email, codigoSis, idFacultad, idCarrera, null);
    }
}
