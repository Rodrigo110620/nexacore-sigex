package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record IncidenciaIngresoRequest(
        @NotNull Integer idTipoIncidencia,
        @Size(max = 1000) String descripcion
) {
}
