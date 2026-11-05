package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * IMP-10: datos para Configuración › Respaldo. El historial sale de la auditoría (cada descarga queda
 * como RESPALDO_DESCARGADO), del más reciente al más antiguo.
 */
public record EstadoRespaldoResponse(
        /** Motor y versión de la base, p. ej. "PostgreSQL 18.6". */
        String baseDatos,
        /** Tamaño de la base en bytes; null si no se puede calcular. */
        Long tamanoBytes,
        /** true si el respaldo automático nocturno está encendido (hay un directorio configurado). */
        boolean automatico,
        List<Respaldo> historial) {

    public record Respaldo(LocalDateTime fecha, String usuario, String archivo, Long bytes) {}
}
