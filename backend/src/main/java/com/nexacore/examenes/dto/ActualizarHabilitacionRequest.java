package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Cambia la habilitación de uno o varios estudiantes del examen a la vez. */
public record ActualizarHabilitacionRequest(
        @NotEmpty(message = "Seleccione al menos un estudiante")
        List<@NotNull Integer> idsEstudiante,
        @NotNull(message = "El estado de habilitación es obligatorio")
        EstudianteHabilitacionResponse.EstadoHabilitacion estadoHabilitacion,
        @Size(max = 40, message = "La razón no puede superar los 40 caracteres")
        String motivo
) {}
