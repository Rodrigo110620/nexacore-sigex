package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/** Nueva fecha de un examen ya finalizado, para repetirlo. El motivo queda en el historial. */
public record ReprogramarExamenRequest(
        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,
        @NotNull(message = "La hora de inicio es obligatoria")
        LocalTime horaInicio,
        @NotNull(message = "La duración es obligatoria")
        @Min(value = 1, message = "La duración debe ser al menos 1 minuto")
        Integer duracionMinutos,
        @NotBlank(message = "Indica el motivo de la reprogramación")
        @Size(max = 200, message = "El motivo no puede superar los 200 caracteres")
        String motivo
) {}
