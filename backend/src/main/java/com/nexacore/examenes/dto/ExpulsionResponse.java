package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Se construye tras persistir y leer la hora que asignó PostgreSQL (V43). */
public record ExpulsionResponse(Integer idExpulsion, Integer idEstudiante, Integer idExamen, String motivo,
                                Integer idResponsable, String responsable, LocalDateTime fechaHora,
                                /** Nombre completo y código SIS del estudiante expulsado (para los reportes). */
                                String estudiante, String codigoSis,
                                /** Si se anuló por error: cuándo, quién y por qué; null si sigue vigente. */
                                LocalDateTime anuladaEn, String anuladaPor, String motivoAnulacion) {
    public ExpulsionResponse(Integer idExpulsion, Integer idEstudiante, Integer idExamen, String motivo,
                             Integer idResponsable, String responsable, LocalDateTime fechaHora) {
        this(idExpulsion, idEstudiante, idExamen, motivo, idResponsable, responsable, fechaHora, null, null);
    }

    public ExpulsionResponse(Integer idExpulsion, Integer idEstudiante, Integer idExamen, String motivo,
                             Integer idResponsable, String responsable, LocalDateTime fechaHora,
                             String estudiante, String codigoSis) {
        this(idExpulsion, idEstudiante, idExamen, motivo, idResponsable, responsable, fechaHora, estudiante, codigoSis,
                null, null, null);
    }
}
