package com.nexacore.examenes.dto;

/** Aula de un examen en el orden en que se llena (0 = principal). capacidad null: aforo sin registrar. */
public record AulaExamenResponse(
        Integer idAmbiente,
        String nombre,
        Integer capacidad,
        int orden
) {}
