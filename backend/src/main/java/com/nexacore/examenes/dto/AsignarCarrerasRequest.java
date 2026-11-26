package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AsignarCarrerasRequest(@NotNull @Size(max = 60) List<Integer> idsCarrera) {}
