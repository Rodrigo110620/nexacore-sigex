package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ActualizarExamenRequest(
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

        List<NormaParticularRequest> normasParticulares,

        Integer idMateria,

        Integer idDocente,

        List<String> normasGeneralesEliminadas,

        List<NormaParticularRequest> normasParticularesEliminadas,

        /** Aulas que se suman a la principal; null conserva las que ya tenía el examen. */
        List<Integer> idAmbientesAdicionales,

        /** ALFABETICO o LLEGADA; null conserva el que tenía el examen. */
        String modoReparto
) {
    public ActualizarExamenRequest(String asignatura, String docente, LocalDate fecha, LocalTime horaInicio,
                                   Integer duracionMinutos, Integer idAmbiente, List<String> normasGenerales,
                                   List<NormaParticularRequest> normasParticulares, Integer idMateria,
                                   Integer idDocente, List<String> normasGeneralesEliminadas,
                                   List<NormaParticularRequest> normasParticularesEliminadas,
                                   List<Integer> idAmbientesAdicionales) {
        this(asignatura, docente, fecha, horaInicio, duracionMinutos, idAmbiente, normasGenerales,
                normasParticulares, idMateria, idDocente, normasGeneralesEliminadas,
                normasParticularesEliminadas, idAmbientesAdicionales, null);
    }

    public ActualizarExamenRequest(String asignatura, String docente, LocalDate fecha, LocalTime horaInicio,
                                   Integer duracionMinutos, Integer idAmbiente, List<String> normasGenerales,
                                   List<NormaParticularRequest> normasParticulares, Integer idMateria,
                                   Integer idDocente, List<String> normasGeneralesEliminadas,
                                   List<NormaParticularRequest> normasParticularesEliminadas) {
        this(asignatura, docente, fecha, horaInicio, duracionMinutos, idAmbiente, normasGenerales,
                normasParticulares, idMateria, idDocente, normasGeneralesEliminadas,
                normasParticularesEliminadas, null, null);
    }
}
