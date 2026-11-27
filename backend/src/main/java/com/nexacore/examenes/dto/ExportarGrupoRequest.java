package com.nexacore.examenes.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Todo un grupo de Reportes (p. ej. «Incidencias»: intentos, expulsiones, excepciones…) en un solo archivo: en Excel una
 * hoja por tipo; en PDF una sección por tipo. Cada sección es un reporte como los de {@link ExportarReporteRequest}.
 */
public record ExportarGrupoRequest(
        @NotBlank @Size(max = 120) String titulo,
        List<@Size(max = 200) String> filtros,
        @NotEmpty @Size(max = 10) List<@Valid ExportarReporteRequest> secciones
) {}
