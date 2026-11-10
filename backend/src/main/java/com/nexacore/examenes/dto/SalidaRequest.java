package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;

/** Registrar la salida del estudiante del examen. */
public record SalidaRequest(@NotNull Integer idEstudiante, @NotNull Integer idExamen) {}
