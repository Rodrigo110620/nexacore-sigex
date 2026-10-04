package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * idEstudiante identifica al estudiante del registro; las normas guardadas antes de
 * exigirlo lo tienen en null y se conservan tal cual.
 */
public record NormaParticularRequest(
        @NotBlank(message = "El estudiante es obligatorio")
        String estudiante,

        @NotBlank(message = "El texto de la norma es obligatorio")
        String texto,

        Integer idEstudiante
) {
    public NormaParticularRequest(String estudiante, String texto) {
        this(estudiante, texto, null);
    }
}
