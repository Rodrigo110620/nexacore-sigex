package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Inicio de CONTROL: sus propios registros de hoy (no los de otros controles). GET /inicio/control.
 */
public record InicioControlResponse(
        LocalDateTime ahora,
        /** Ingresos que autorizó hoy (por QR o CI y manuales). */
        int ingresos,
        /** De esos, los manuales (sin QR, con justificación). */
        int ingresosManuales,
        int intentosIncorrectos,
        int fotosReportadas,
        int qrDuplicados,
        int expulsiones,
        /** Ingresos que autorizó hoy, por hora (índice 0 a 23). */
        int[] ingresosPorHora,
        /** Intentos incorrectos, fotos reportadas y QR duplicados que registró hoy, por hora (0 a 23). */
        int[] intentosPorHora,
        int[] fotosPorHora,
        int[] qrPorHora,
        /** Sus últimos registros de hoy, del más reciente al más antiguo. */
        List<Registro> recientes) {

    /** tipo: INGRESO, INGRESO_MANUAL, INTENTO, FOTO_REPORTADA, QR_DUPLICADO o EXPULSION. */
    public record Registro(LocalDateTime fecha, String tipo, String estudiante, String codigo, String examen) {}
}
