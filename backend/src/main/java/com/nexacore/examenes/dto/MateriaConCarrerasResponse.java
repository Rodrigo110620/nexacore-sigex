package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Materia del catálogo con sus carreras (plan de estudios, V63), si está activa (V64) y su oferta en el periodo activo:
 * cuántos grupos y docentes tiene en ese semestre. Sin carreras: no restringe.
 */
public record MateriaConCarrerasResponse(Integer idMateria, String sigla, String nombre, List<CarreraDeMateria> carreras,
                                         boolean activa, int gruposEnPeriodo, int docentesEnPeriodo,
                                         /** La sigla la sugirió SIGEX: falta reemplazarla por la oficial. */
                                         boolean siglaProvisional) {
    public record CarreraDeMateria(Integer idCarrera, String nombre) {}

    public MateriaConCarrerasResponse(Integer idMateria, String sigla, String nombre, List<CarreraDeMateria> carreras) {
        this(idMateria, sigla, nombre, carreras, true, 0, 0, false);
    }
}
