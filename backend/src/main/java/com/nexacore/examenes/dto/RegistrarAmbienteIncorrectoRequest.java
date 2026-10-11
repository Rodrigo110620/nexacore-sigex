package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** ACCS-06: el estudiante pertenece al examen pero se presentó en otra aula. */
public record RegistrarAmbienteIncorrectoRequest(
        @NotNull(message = "El examen es obligatorio") Integer idExamen,
        @NotNull(message = "El estudiante es obligatorio") Integer idEstudiante,
        @NotBlank(message = "Indique el aula en la que se presentó el estudiante")
        @Pattern(regexp = "^\\s*[A-Za-z0-9]{2,20}\\s*$",
                message = "El aula actual solo admite letras y números, entre 2 y 20 caracteres")
        String aulaActual
) {}
