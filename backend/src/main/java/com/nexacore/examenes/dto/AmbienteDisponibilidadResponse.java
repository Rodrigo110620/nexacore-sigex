package com.nexacore.examenes.dto;

/** Un ambiente y si está libre en el horario consultado; si no, con qué examen choca («Base de Datos I · G1 · 18:35–20:05»). */
public record AmbienteDisponibilidadResponse(
        Integer id,
        String nombre,
        String ubicacion,
        Integer capacidad,
        String pabellon,
        boolean disponible,
        String ocupadoPor
) {
    public AmbienteDisponibilidadResponse(Integer id, String nombre, String ubicacion, Integer capacidad, String pabellon,
                                          boolean disponible) {
        this(id, nombre, ubicacion, capacidad, pabellon, disponible, null);
    }
}
