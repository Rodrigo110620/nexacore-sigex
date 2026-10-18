package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Foto enviada por un estudiante que espera la aprobación de la administración. */
public record FotoPendienteResponse(
        Integer idEstudiante,
        String codigoSis,
        String nombre,
        String apellidos,
        LocalDateTime enviadaEn,
        /** Ruta de la API para ver la foto enviada. */
        String fotoUrl
) {}
