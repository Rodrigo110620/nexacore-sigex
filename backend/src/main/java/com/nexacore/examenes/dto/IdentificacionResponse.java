package com.nexacore.examenes.dto;

/**
 * Estudiante identificado en el control de ingreso (HU ACCS-01).
 *
 * fotoUrl es null mientras la base de datos no tenga una columna de foto;
 * carrera es null si el estudiante no tiene una asignada.
 * Con HABILITADO o DESHABILITADO el frontend habilita "Continuar" hacia la
 * verificación (que muestra el motivo); con NO_VINCULADO muestra el modal de aviso.
 */
public record IdentificacionResponse(
        String nombre,
        String apellidos,
        String codigoSis,
        String ci,
        String carrera,
        String fotoUrl,
        Estado estado
) {

    /** Situación del estudiante respecto al examen consultado. */
    public enum Estado { HABILITADO, DESHABILITADO, NO_VINCULADO }
}
