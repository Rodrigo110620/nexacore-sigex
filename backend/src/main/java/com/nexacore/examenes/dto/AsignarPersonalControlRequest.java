package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** El personal de control de un examen: reemplaza al que tenía. Una lista vacía lo deja sin asignar. */
public record AsignarPersonalControlRequest(@NotNull @Size(max = 20) List<Integer> idUsuarios) {}
