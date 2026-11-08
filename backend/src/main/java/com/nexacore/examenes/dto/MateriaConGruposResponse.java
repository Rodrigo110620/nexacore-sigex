package com.nexacore.examenes.dto;

import java.util.List;

/** Una materia del docente con sus grupos (G1, G2…), ordenados por número. */
public record MateriaConGruposResponse(Integer id, String sigla, String nombre, List<String> grupos) {}
