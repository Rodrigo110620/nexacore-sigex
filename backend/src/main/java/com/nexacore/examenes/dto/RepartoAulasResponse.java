package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Ocupación de las aulas de un examen según el reparto alfabético.
 * sinAula: estudiantes que rinden y no entran en el aforo; hay que sumar otra aula.
 */
public record RepartoAulasResponse(
        List<OcupacionAula> aulas,
        int sinAula
) {
    /** capacidad null: aforo sin registrar (con una sola aula entran todos). */
    public record OcupacionAula(Integer idAmbiente, String nombre, Integer capacidad, int orden, int asignados) {}
}
