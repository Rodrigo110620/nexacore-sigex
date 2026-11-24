package com.nexacore.examenes.dto;

import java.util.List;

/** Materia con las carreras a las que pertenece (plan de estudios, V63). Sin carreras: no restringe. */
public record MateriaConCarrerasResponse(Integer idMateria, String sigla, String nombre, List<CarreraDeMateria> carreras) {
    public record CarreraDeMateria(Integer idCarrera, String nombre) {}
}
