package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/** Resumen privado de una incidencia de QR para el informe del examen. */
public record ReporteQrDuplicadoResponse(
        Integer idReporte, String estudianteQr, String codigoSisQr,
        String nombresPresentado, String ciPresentado, boolean presentoCarnet, String codigoSisPresentado,
        String detalle, String personalControl, String estado, LocalDateTime fechaHora) {}
