package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Un reporte tal como se ve en pantalla (pestaña, filtros y filas) para descargarlo en Excel o PDF. Solo se da formato a
 * lo que el usuario ya consultó con sus permisos: el servidor no agrega datos.
 */
public record ExportarReporteRequest(
        @NotBlank @Size(max = 120) String titulo,
        /** «Examen: Cálculo I · Periodo: Este mes · Búsqueda: …» */
        List<@Size(max = 200) String> filtros,
        @NotEmpty @Size(max = 20) List<@Size(max = 60) String> columnas,
        @NotNull @Size(max = 5000) List<@Size(max = 20) List<@Size(max = 1000) String>> filas
) {}
