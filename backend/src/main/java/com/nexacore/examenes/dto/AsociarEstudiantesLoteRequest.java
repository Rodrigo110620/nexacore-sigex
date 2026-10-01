package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** identificadores son códigos universitarios o CI; pueden mezclarse. */
public record AsociarEstudiantesLoteRequest(
        @NotEmpty(message = "Ingrese al menos un código universitario o CI")
        @Size(max = 500, message = "Se pueden asociar hasta 500 estudiantes a la vez")
        List<String> identificadores
) {}
