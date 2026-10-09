package com.nexacore.examenes.dto;

public record AmbienteResponse(
        Integer id,
        String nombre,
        String ubicacion,
        Integer capacidad,
        String pabellon
) {}
