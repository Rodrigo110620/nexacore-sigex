package com.nexacore.examenes.dto;

import java.time.LocalDate;

public record PeriodoAcademicoResponse(Integer idPeriodo, String nombre, LocalDate fechaInicio, LocalDate fechaFin,
                                       boolean activo) {}
