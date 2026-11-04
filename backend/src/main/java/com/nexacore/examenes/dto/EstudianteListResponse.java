package com.nexacore.examenes.dto;

import java.util.List;

public record EstudianteListResponse(
    Integer id,
    String codigoSis,
    String nombre,
    String apellidos,
    String ci,
    String telefono,
    String email,
    List<CarreraInfo> carreras,
    String condicion,
    String fotoUrl,
    String estadoMatricula,
    boolean tieneCuenta,
    List<MateriaDocenteResponse> materiasDocente
) {
    public EstudianteListResponse(Integer id, String codigoSis, String nombre, String apellidos,
            String ci, String telefono, String email, List<CarreraInfo> carreras, String condicion,
            String fotoUrl, String estadoMatricula, boolean tieneCuenta) {
        this(id, codigoSis, nombre, apellidos, ci, telefono, email, carreras, condicion,
                fotoUrl, estadoMatricula, tieneCuenta, null);
    }

    public EstudianteListResponse conMateriasDocente(List<MateriaDocenteResponse> materias) {
        return new EstudianteListResponse(id, codigoSis, nombre, apellidos, ci, telefono, email,
                carreras, condicion, fotoUrl, estadoMatricula, tieneCuenta, materias);
    }

    public record CarreraInfo(
        Integer idCarrera,
        String nombreCarrera,
        Integer idFacultad,
        String nombreFacultad
    ) {}
}