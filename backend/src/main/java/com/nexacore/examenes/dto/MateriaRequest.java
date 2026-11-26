package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Alta o edición de una materia del catálogo; idsCarrera null al editar = no se tocan sus carreras. */
public record MateriaRequest(
        /** Opcional al crear: vacía, SIGEX sugiere una a partir del nombre y la marca como provisional. */
        @Size(max = 15, message = "La sigla tiene hasta 15 caracteres") String sigla,
        @NotBlank(message = "El nombre es obligatorio") @Size(max = 100, message = "El nombre tiene hasta 100 caracteres") String nombre,
        @Size(max = 60) List<Integer> idsCarrera) {}
