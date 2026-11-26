package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Resultado de una asociación masiva: cuántos se asociaron, qué identificadores ya
 * estaban en el examen o no existen, y el listado actualizado del examen.
 */
public record AsociacionLoteResponse(
        int asociados,
        List<String> yaAsociados,
        List<String> noEncontrados,
        List<EstudianteHabilitacionResponse> estudiantes,
        /** No matriculados (inactivos): no se asocian a exámenes (2.º test run). */
        List<String> noMatriculados,
        /** V63: de una carrera a la que no pertenece la materia (y sin inscripción oficial en el grupo): no se asocian. */
        List<String> deOtraCarrera
) {
    public AsociacionLoteResponse(int asociados, List<String> yaAsociados, List<String> noEncontrados,
                                  List<EstudianteHabilitacionResponse> estudiantes) {
        this(asociados, yaAsociados, noEncontrados, estudiantes, List.of(), List.of());
    }

    public AsociacionLoteResponse(int asociados, List<String> yaAsociados, List<String> noEncontrados,
                                  List<EstudianteHabilitacionResponse> estudiantes, List<String> noMatriculados) {
        this(asociados, yaAsociados, noEncontrados, estudiantes, noMatriculados, List.of());
    }
}
