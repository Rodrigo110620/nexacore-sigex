package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/** IMP-12: las materias de un docente (reemplazan a las que tenía). */
public record AsignarMateriasRequest(@NotNull(message = "Elige al menos una materia para el docente.") List<Integer> idMaterias) {}
