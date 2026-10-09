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
        List<EstudianteHabilitacionResponse> estudiantes
) {}
