package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.nexacore.examenes.models.CondicionEstudiante;
import com.nexacore.examenes.models.EstadoMatricula;

public record ActualizarEstudianteRequest(
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = ReglasEstudiante.NOMBRE_MIN, max = ReglasEstudiante.NOMBRE_MAX, message = "El nombre debe tener entre 2 y 50 caracteres")
    @Pattern(regexp = ReglasEstudiante.NOMBRE, message = ReglasEstudiante.MSG_NOMBRE)
    String nombre,

    @NotBlank(message = "Los apellidos son obligatorios")
    @Size(min = ReglasEstudiante.APELLIDOS_MIN, max = ReglasEstudiante.APELLIDOS_MAX, message = "Los apellidos deben tener entre 2 y 80 caracteres")
    @Pattern(regexp = ReglasEstudiante.NOMBRE, message = ReglasEstudiante.MSG_APELLIDOS)
    String apellidos,

    @NotBlank(message = "El código SIS es obligatorio")
    @Pattern(regexp = ReglasEstudiante.CODIGO_SIS, message = ReglasEstudiante.MSG_CODIGO_SIS)
    String codigoSis,

    @NotBlank(message = "El documento es obligatorio")
    @Pattern(regexp = ReglasEstudiante.CI, message = ReglasEstudiante.MSG_CI)
    String ci,

    /** Opcional: si no se envía se conserva; vacío lo quita. */
    @Pattern(regexp = ReglasEstudiante.TELEFONO, message = ReglasEstudiante.MSG_TELEFONO)
    String telefono,

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Pattern(regexp = ReglasEstudiante.EMAIL, message = ReglasEstudiante.MSG_EMAIL)
    @Size(max = ReglasEstudiante.EMAIL_MAX, message = "El correo no puede superar 100 caracteres")
    String email,

    @NotNull(message = "La facultad es obligatoria")
    Integer idFacultad,

    @NotNull(message = "La carrera es obligatoria")
    Integer idCarrera,

    /** Opcional: si no se envía, se conserva la condición actual. */
    @Pattern(regexp = CondicionEstudiante.PATRON, message = "La condición debe ser Regular o Postulante")
    String condicion,

    /** Opcional: si no se envía, se conserva el estado actual. */
    @Pattern(regexp = EstadoMatricula.PATRON, message = "El estado de matrícula debe ser Matriculado o No matriculado")
    String estadoMatricula
) {
    public ActualizarEstudianteRequest(String nombre, String apellidos, String codigoSis, String ci, String email,
                                       Integer idFacultad, Integer idCarrera, String condicion) {
        this(nombre, apellidos, codigoSis, ci, null, email, idFacultad, idCarrera, condicion, null);
    }
}