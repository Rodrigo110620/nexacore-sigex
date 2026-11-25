package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** Un examen próximo que todavía no tiene personal de control asignado. */
public record ExamenSinPersonalResponse(Integer idExamen, Integer idParalelo, String materia, String grupo,
                                        LocalDate fecha, LocalTime horaInicio, int aulas) {}
