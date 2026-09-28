package com.nexacore.examenes.dto;

/** Fila de "Control del examen" (HU ACCS-01): estado nunca es NO_VINCULADO; motivo solo con DESHABILITADO. */
public record EstudianteAsignadoResponse(
        Integer idEstudiante,
        String nombre,
        String apellidos,
        String codigoSis,
        String ci,
        String carrera,
        IdentificacionResponse.Estado estado,
        String motivoInhabilitacion,
        boolean ingresado
) {}
