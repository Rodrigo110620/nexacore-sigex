package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

public record ReasignarAmbienteResponse(
        Integer idEstudiante,
        Integer idExamen,
        Integer idAmbienteOrigen,
        String aulaOrigenNombre,
        Integer idAmbienteDestino,
        String aulaDestinoNombre,
        LocalDateTime horaIngresoOriginal,
        String observacionTraslado,
        boolean trasladado
) {
}
