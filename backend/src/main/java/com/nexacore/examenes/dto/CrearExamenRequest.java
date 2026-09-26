package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CrearExamenRequest(
        @NotBlank(message = "La asignatura es obligatoria")
        String asignatura,

        @NotBlank(message = "El docente responsable es obligatorio")
        String docente,

        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,

        @NotNull(message = "La hora de inicio es obligatoria")
        LocalTime horaInicio,

        @NotNull(message = "La duración es obligatoria")
        @Min(value = 1, message = "La duración debe ser al menos 1 minuto")
        Integer duracionMinutos,

        @NotNull(message = "El ambiente es obligatorio")
        Integer idAmbiente,

        List<String> normasGenerales,

        List<NormaParticularRequest> normasParticulares
) {}
