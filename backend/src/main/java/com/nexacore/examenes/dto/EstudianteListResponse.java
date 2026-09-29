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
    String email,
    List<CarreraInfo> carreras
) {
    public record CarreraInfo(
        Integer idCarrera,
        String nombreCarrera,
        Integer idFacultad,
        String nombreFacultad
    ) {}
}