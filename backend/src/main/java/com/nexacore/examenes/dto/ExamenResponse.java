package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ExamenResponse(
        Integer idExamen,
        Integer idParalelo,
        String asignatura,
        String sigla,
        String docente,
        LocalDate fecha,
        LocalTime horaInicio,
        Integer duracionMinutos,
        Integer idAmbiente,
        String ambienteNombre,
        String ambienteUbicacion,
        String estado,
        List<String> normasGenerales,
        List<NormaParticularRequest> normasParticulares,
        Integer idMateria,
        Integer idDocente,
        /** Aula principal y adicionales, en el orden en que se llenan. */
        List<AulaExamenResponse> aulas,
        /** ALFABETICO o LLEGADA. */
        String modoReparto
) {}
