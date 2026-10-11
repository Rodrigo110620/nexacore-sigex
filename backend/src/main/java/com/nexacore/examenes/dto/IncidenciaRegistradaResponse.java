package com.nexacore.examenes.dto;

/** Incidencia registrada junto con un control de ingreso, para mostrarla en el historial. */
public record IncidenciaRegistradaResponse(
        String tipo,
        String descripcion
) {
}
