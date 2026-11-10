package com.nexacore.examenes.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Una operación auditada, presentada para la consulta administrativa: a qué afectó (objetivo), un
 * resumen legible (detalle), el motivo si lo hubo y los cambios campo por campo ya con nombres.
 * cambios conserva el JSON original de la auditoría.
 */
public record HistorialOperacionResponse(
        Integer id,
        LocalDateTime fechaHora,
        Integer idUsuario,
        String usuario,
        String rolUsuario,
        String email,
        String modulo,
        String operacion,
        String accion,
        String detalle,
        String objetivo,
        String motivo,
        List<Diferencia> diferencias,
        /** Del examen al que se refiere (si es de un examen): fecha, horario de inicio a fin, aula y docente. */
        List<Dato> examen,
        JsonNode cambios) {

    /** Un dato de contexto: «Horario» → «12:15 – 12:45». */
    public record Dato(String campo, String valor) {}

    /** Un campo que cambió: antes es null si se agregó; despues es null si se quitó. */
    public record Diferencia(String campo, String antes, String despues) {}
}
