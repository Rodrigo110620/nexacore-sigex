package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/**
 * Solicitud en la revisión de fotos del ADMIN: un cambio de foto enviado por el estudiante o una
 * foto reportada por el personal de control.
 */
public record FotoPendienteResponse(
        Integer idEstudiante,
        String codigoSis,
        String nombre,
        String apellidos,
        /** Carreras del estudiante separadas por coma, o null. */
        String carrera,
        /** CAMBIO: el estudiante cambió su foto. REPORTE: el personal de control la reportó. */
        String origen,
        /** PENDIENTE: hay una foto nueva por revisar. ESPERANDO_FOTO: reportada, el estudiante aún no la reemplaza. */
        String estado,
        /** Cuándo envió la foto nueva; null mientras se espera. */
        LocalDateTime enviadaEn,
        /** Ruta de la API para ver la foto enviada, o null si aún no la envía. */
        String fotoUrl,
        /** Ruta de la foto vigente (la que ve el personal de control), o null. */
        String fotoActualUrl,
        /** Datos del reporte del personal de control; null si es un cambio de foto. */
        Reporte reporte
) {
    public static final String PENDIENTE = "PENDIENTE";
    public static final String ESPERANDO_FOTO = "ESPERANDO_FOTO";

    public record Reporte(String motivo, String detalle, String reportadoPor, LocalDateTime reportadoEn) {}
}
