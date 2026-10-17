package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Fila del listado general de estudiantes para el ADMIN.
 * Incluye las carreras del estudiante (puede tener varias).
 */
public record EstudianteListResponse(
    Integer id,
    String codigoSis,
    String nombre,
    String apellidos,
    String ci,
    String telefono,
    String email,
    List<CarreraInfo> carreras,
    /** REGULAR o POSTULANTE. */
    String condicion,
    /** Ruta de la API para descargar la foto (con el token), o null si no tiene. */
    String fotoUrl,
    /** Teléfono o celular, o null si no se registró. */
    String telefono,
    /** MATRICULADO o NO_MATRICULADO. */
    String estadoMatricula,
    /** true si el estudiante ya activó su cuenta de usuario. */
    boolean tieneCuenta
) {
    public EstudianteListResponse(Integer id, String codigoSis, String nombre, String apellidos, String ci,
                                  String email, List<CarreraInfo> carreras) {
        this(id, codigoSis, nombre, apellidos, ci, null,  email, carreras, "REGULAR", null);
    }

    public EstudianteListResponse(Integer id, String codigoSis, String nombre, String apellidos, String ci,
                                  String email, List<CarreraInfo> carreras, String condicion, String fotoUrl) {
        this(id, codigoSis, nombre, apellidos, ci, email, carreras, condicion, fotoUrl, null, "MATRICULADO", false);
    }

    public record CarreraInfo(
        Integer idCarrera,
        String nombreCarrera,
        Integer idFacultad,
        String nombreFacultad
    ) {}
}