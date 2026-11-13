package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Size;

/** Marca la consulta como atendida; si hay respuesta, se envía por correo a quien escribió. */
public record AtenderSolicitudAyudaRequest(
        @Size(max = 1000, message = "La respuesta no puede superar 1000 caracteres") String respuesta) {}
