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
        boolean ingresado,
        Integer idAmbienteIngreso,
        /** Ruta de la foto; null si no tiene (el control no podrá autorizar su ingreso). */
        String fotoUrl,
        /** INCI-03: aula original si lo trasladaron en la sesión actual ("Trasladado desde ..."); null si no. */
        String trasladadoDesde,
        /** INCI-03: aula actual tras el traslado ("Trasladado de 691A a 692B"); null si no lo trasladaron. */
        String trasladadoA
) {
    public EstudianteAsignadoResponse(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String ci,
                                      String carrera, IdentificacionResponse.Estado estado, String motivoInhabilitacion,
                                      boolean ingresado) {
        this(idEstudiante, nombre, apellidos, codigoSis, ci, carrera, estado, motivoInhabilitacion, ingresado, null, null, null, null);
    }
}
