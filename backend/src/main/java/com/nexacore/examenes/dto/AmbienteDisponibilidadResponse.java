package com.nexacore.examenes.dto;

public record AmbienteDisponibilidadResponse(
        Integer id,
        String nombre,
        String ubicacion,
        Integer capacidad,
        String pabellon,
        boolean disponible
) {}
