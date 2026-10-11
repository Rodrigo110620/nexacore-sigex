package com.nexacore.examenes.dto;

/**
 * Estudiante identificado en el control de ingreso (HU ACCS-01).
 *
 * fotoUrl es la ruta de la API para descargar la foto (con el token), o null si no tiene;
 * condicion es REGULAR o POSTULANTE;
 * carrera trae sus carreras separadas por coma, o null si no tiene ninguna; motivoInhabilitacion solo viene con DESHABILITADO.
 * Con HABILITADO o DESHABILITADO el frontend habilita "Continuar" hacia la
 * verificación (que muestra el motivo); con NO_VINCULADO muestra el modal de aviso.
 */
public record IdentificacionResponse(
        Integer idEstudiante,
        String nombre,
        String apellidos,
        String codigoSis,
        String ci,
        String carrera,
        String fotoUrl,
        Estado estado,
        String motivoInhabilitacion,
        String condicion
) {

    /** Situación del estudiante respecto al examen consultado. */
    public enum Estado { HABILITADO, DESHABILITADO, NO_VINCULADO }
}
