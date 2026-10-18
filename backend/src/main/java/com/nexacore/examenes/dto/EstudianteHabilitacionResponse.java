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
        String motivo,
        /** Aula que le toca por orden alfabético y aforo; null si no entra o no rinde. */
        String aula,
        /** true si ya ingresó al examen: entonces no se lo puede quitar ni inhabilitar. */
        boolean ingresado,
        /** Aviso si tiene otro examen que se cruza en horario ese día; null si no. No bloquea. */
        String conflictoHorario
) {
    public EstudianteHabilitacionResponse(Integer idEstudiante, String nombre, String apellidos, String codigoSis,
                                          String ci, String facultad, EstadoHabilitacion estadoHabilitacion,
                                          String motivo, String aula) {
        this(idEstudiante, nombre, apellidos, codigoSis, ci, facultad, estadoHabilitacion, motivo, aula, false, null);
    }

    /** Refleja asistencia_examen.habilitado: true → HABILITADO; false → NO_HABILITADO; null → PENDIENTE. */
    public enum EstadoHabilitacion { PENDIENTE, HABILITADO, NO_HABILITADO }
}
