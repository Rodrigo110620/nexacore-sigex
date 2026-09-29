package com.nexacore.examenes.dto;

public record CarreraResponse(
    Integer idCarrera,
    String nombre,
    String codigo,
    Integer idFacultad,
    String nombreFacultad
) {}