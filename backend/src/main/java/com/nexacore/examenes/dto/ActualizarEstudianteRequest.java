package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.nexacore.examenes.models.CondicionEstudiante;
import com.nexacore.examenes.models.EstadoMatricula;

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

    @Size(max = 8, message = "El teléfono no puede tener más de 8 caracteres")
    @Pattern(regexp = "^[23467]\\d{6,7}$", message = "El teléfono debe tener 7 u 8 dígitos y empezar con 2, 3, 4, 6 o 7")
    String telefono,

    @Email(message = "Formato de correo inválido")
    @Size(min = 5, max = 50, message = "El correo debe tener entre 5 y 50 caracteres")
    String email,

    @NotNull(message = "La facultad es obligatoria")
    Integer idFacultad,

    @NotNull(message = "La carrera es obligatoria")
    Integer idCarrera,

    /** Opcional: si no se envía, se conserva la condición actual. */
    @Pattern(regexp = CondicionEstudiante.PATRON, message = "La condición debe ser Regular o Postulante")
    String condicion,

    /** Opcional: si no se envía, se conserva; vacío lo quita. 8 dígitos que empiezan con 5, 6 o 7. */
    @Pattern(regexp = EstadoMatricula.PATRON_TELEFONO, message = "El teléfono debe tener 8 dígitos y empezar con 5, 6 o 7")
    String telefono,

    /** Opcional: si no se envía, se conserva el estado actual. */
    @Pattern(regexp = EstadoMatricula.PATRON, message = "El estado de matrícula debe ser Matriculado o No matriculado")
    String estadoMatricula
) {
    public ActualizarEstudianteRequest(String nombre, String apellidos, String codigoSis, String ci, String email,
                                       Integer idFacultad, Integer idCarrera) {
        this(nombre, apellidos, codigoSis, ci, null, email, idFacultad, idCarrera, null);
    }

    public ActualizarEstudianteRequest(String nombre, String apellidos, String codigoSis, String ci, String email,
                                       Integer idFacultad, Integer idCarrera, String condicion) {
        this(nombre, apellidos, codigoSis, ci, email, idFacultad, idCarrera, condicion, null, null);
    }
}