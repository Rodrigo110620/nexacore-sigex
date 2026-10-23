package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegistrarExceptionRequest(
    @NotNull(message = "El estudiante es obligatorio") Integer idEstudiante,
    @NotNull(message = "El examen es obligatorio") Integer idExamen,
    @NotNull(message = "El ambiente es obligatorio") Integer idAmbiente,
    @NotNull(message = "El motivo de inhabilitación es obligatorio") String motivoInhabilitacion,
    @NotBlank(message = "La acción tomada es obligatoria") String accionTomada,
    String observaciones
) {}