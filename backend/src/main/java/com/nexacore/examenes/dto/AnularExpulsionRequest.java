package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Anular una expulsión registrada por error: el motivo es obligatorio. */
public record AnularExpulsionRequest(
        @NotBlank(message = "Indica por qué se anula la expulsión")
        @Size(min = 10, max = 100, message = "El motivo de la anulación debe contener entre 10 y 100 caracteres")
        String motivo
) {}
