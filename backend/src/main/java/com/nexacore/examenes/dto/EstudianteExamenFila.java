package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/**
 * Resultado de la identificación y del listado del examen (HU ACCS-01): datos del estudiante
 * y su fila de asistencia_examen para un examen dado.
 *
 * Los campos desde idExamen llegan en null cuando el estudiante no tiene fila en
 * asistencia_examen para ese examen (LEFT JOIN sin coincidencia). carrera trae
 * todas las carreras del estudiante separadas por coma, o null si no tiene ninguna.
 * Uso interno entre repositorio y service; no se expone en la API.
 */
public record EstudianteExamenFila(
        Integer idEstudiante,
        String nombre,
        String apellidos,
        String codigoSis,
        String ci,
        String carrera,
        Integer idExamen,
        Boolean habilitado,
        String motivoInhabilitacion,
        LocalDateTime fechaHoraIngreso
) {}
