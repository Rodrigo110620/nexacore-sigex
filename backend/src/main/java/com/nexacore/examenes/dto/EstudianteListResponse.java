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
    boolean tieneCuenta
) {
    public record CarreraInfo(
        Integer idCarrera,
        String nombreCarrera,
        Integer idFacultad,
        String nombreFacultad
    ) {}
}