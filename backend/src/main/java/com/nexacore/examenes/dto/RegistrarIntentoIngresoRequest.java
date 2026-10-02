package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos del intento de acceso de un estudiante no asociado al examen. */
public record RegistrarIntentoIngresoRequest(
        @NotNull(message = "El examen es obligatorio") Integer idExamen,
        @NotNull(message = "El estudiante es obligatorio") Integer idEstudiante,
        @NotBlank(message = "El identificador presentado es obligatorio") @Size(max = 50) String identificador,
        @NotBlank(message = "Indique el motivo del intento") @Size(max = 500) String motivo
) {}
