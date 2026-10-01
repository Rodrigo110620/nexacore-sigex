package com.nexacore.examenes.dto;

/**
 * Fila de la pestaña "Estudiantes habilitados" de un examen.
 * facultad trae todas las facultades del estudiante separadas por coma, o "—" si no tiene carreras.
 */
public record EstudianteHabilitacionResponse(
        Integer idEstudiante,
        String nombre,
        String apellidos,
        String codigoSis,
        String ci,
        String facultad,
        EstadoHabilitacion estadoHabilitacion,
        String motivo
) {
    /** Refleja asistencia_examen.habilitado: false → NO_HABILITADO; true o null → HABILITADO. */
    public enum EstadoHabilitacion { HABILITADO, NO_HABILITADO }
}
