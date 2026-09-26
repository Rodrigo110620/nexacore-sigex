package com.nexacore.examenes.dto;

public record AmbienteDisponibilidadResponse(
        Integer id,
        String nombre,
        String ubicacion,
        boolean disponible
) {}
