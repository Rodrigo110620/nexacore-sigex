package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Salida registrada, con la hora del servidor. */
public record SalidaResponse(Integer idEstudiante, Integer idExamen, LocalDateTime fechaHoraSalida) {}
