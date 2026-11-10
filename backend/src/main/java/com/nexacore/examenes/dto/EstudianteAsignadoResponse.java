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
        String trasladadoA,
        /** Nombre del aula donde ingresó (p. ej. «608»); null si aún no ingresó. */
        String aulaIngreso,
        /** Hora en que salió del examen (V56); null si no salió. */
        java.time.LocalDateTime fechaHoraSalida,
        /** No marcó salida y el examen ya terminó: fechaHoraSalida es la hora de fin («al cierre»). */
        boolean salidaAlCierre
) {
    public EstudianteAsignadoResponse(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String ci,
                                      String carrera, IdentificacionResponse.Estado estado, String motivoInhabilitacion,
                                      boolean ingresado, Integer idAmbienteIngreso, String fotoUrl, String trasladadoDesde,
                                      String trasladadoA, String aulaIngreso, java.time.LocalDateTime fechaHoraSalida) {
        this(idEstudiante, nombre, apellidos, codigoSis, ci, carrera, estado, motivoInhabilitacion, ingresado,
                idAmbienteIngreso, fotoUrl, trasladadoDesde, trasladadoA, aulaIngreso, fechaHoraSalida, false);
    }

    public EstudianteAsignadoResponse(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String ci,
                                      String carrera, IdentificacionResponse.Estado estado, String motivoInhabilitacion,
                                      boolean ingresado, Integer idAmbienteIngreso, String fotoUrl, String trasladadoDesde,
                                      String trasladadoA, String aulaIngreso) {
        this(idEstudiante, nombre, apellidos, codigoSis, ci, carrera, estado, motivoInhabilitacion, ingresado,
                idAmbienteIngreso, fotoUrl, trasladadoDesde, trasladadoA, aulaIngreso, null);
    }

    public EstudianteAsignadoResponse(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String ci,
                                      String carrera, IdentificacionResponse.Estado estado, String motivoInhabilitacion,
                                      boolean ingresado) {
        this(idEstudiante, nombre, apellidos, codigoSis, ci, carrera, estado, motivoInhabilitacion, ingresado, null, null, null, null, null);
    }

    public EstudianteAsignadoResponse(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String ci,
                                      String carrera, IdentificacionResponse.Estado estado, String motivoInhabilitacion,
                                      boolean ingresado, Integer idAmbienteIngreso, String fotoUrl, String trasladadoDesde,
                                      String trasladadoA) {
        this(idEstudiante, nombre, apellidos, codigoSis, ci, carrera, estado, motivoInhabilitacion, ingresado,
                idAmbienteIngreso, fotoUrl, trasladadoDesde, trasladadoA, null);
    }
}
