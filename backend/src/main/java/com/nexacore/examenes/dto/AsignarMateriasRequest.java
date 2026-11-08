package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

/**
 * IMP-12: las materias de un docente (reemplazan a las que tenía) y, opcional, los grupos de cada una
 * ({@code {idMateria: ["G1", "G2"]}}). Sin {@code grupos} no se tocan los grupos que ya tiene.
 */
public record AsignarMateriasRequest(
        @NotNull(message = "Elige al menos una materia para el docente.") List<Integer> idMaterias,
        Map<Integer, List<String>> grupos) {

    public AsignarMateriasRequest(List<Integer> idMaterias) {
        this(idMaterias, null);
    }
}
