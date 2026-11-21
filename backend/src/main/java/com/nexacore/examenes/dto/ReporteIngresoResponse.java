package com.nexacore.examenes.dto;
import java.time.LocalDateTime;

public record ReporteIngresoResponse(
    Integer idControl,
    String examen,
    String estudiante,
    String codigoSis,
    String tipoIngreso,
    String controlador,
    LocalDateTime fechaHora
) {}