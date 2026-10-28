package com.nexacore.examenes.dto;

import com.nexacore.examenes.models.ReporteFoto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Reporte de una foto que no coincide, desde el control de ingreso. */
public record ReportarFotoRequest(
        @NotNull(message = "Indica qué pasa con la foto")
        ReporteFoto.Motivo motivo,

        @Size(max = 65, message = "El detalle no puede superar 65 caracteres")
        String detalle,

        /** Examen en cuyo control de ingreso se reporta; opcional. */
        Integer idExamen
) {}
