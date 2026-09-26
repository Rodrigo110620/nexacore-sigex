package com.nexacore.examenes.dto;

/**
 * Resultado de la consulta de identificación (HU ACCS-01): datos del estudiante
 * y su fila de asistencia_examen para un examen dado.
 *
 * idExamen y habilitado llegan en null cuando el estudiante no tiene fila en
 * asistencia_examen para ese examen (LEFT JOIN sin coincidencia). carrera llega
 * en null si el estudiante no tiene una asignada.
 * Uso interno entre repositorio y service; no se expone en la API.
 */
public record EstudianteExamenFila(
        String nombre,
        String apellidos,
        String codigoSis,
        String ci,
        String carrera,
        Integer idExamen,
        Boolean habilitado
) {}
