package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Se construye tras persistir y leer la hora que asignó PostgreSQL (V43). */
public record ExpulsionResponse(Integer idExpulsion, Integer idEstudiante, Integer idExamen, String motivo,
                                Integer idResponsable, String responsable, LocalDateTime fechaHora,
                                /** Nombre completo y código SIS del estudiante expulsado (para los reportes). */
                                String estudiante, String codigoSis) {
    public ExpulsionResponse(Integer idExpulsion, Integer idEstudiante, Integer idExamen, String motivo,
                             Integer idResponsable, String responsable, LocalDateTime fechaHora) {
        this(idExpulsion, idEstudiante, idExamen, motivo, idResponsable, responsable, fechaHora, null, null);
    }
}
