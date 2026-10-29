package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReasignarAmbienteRequest(
        @NotNull(message = "El aula destino es obligatoria")
        Integer idAmbienteDestino,
        @NotBlank(message = "El motivo es obligatorio")
        @Size(max = 65, message = "El motivo no puede superar 65 caracteres")
        String motivo,
        @Size(max = 1000, message = "La observación no puede superar 1000 caracteres")
        String observacion
) {
}
