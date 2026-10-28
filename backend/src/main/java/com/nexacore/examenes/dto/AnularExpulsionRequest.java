package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Anular una expulsión registrada por error: el motivo es obligatorio. */
public record AnularExpulsionRequest(
        @NotBlank(message = "Indica por qué se anula la expulsión")
        @Size(max = 200, message = "El motivo de la anulación no puede superar 200 caracteres")
        String motivo
) {}
