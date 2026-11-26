package com.nexacore.examenes.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * El personal de control de un examen: reemplaza al que tenía. Una lista vacía lo deja sin asignar.
 * {@code aulas} (opcional, V66): el aula de cada uno (idUsuario → idAmbiente). Sin ella, si el examen tiene varias
 * aulas, se reparten en orden: uno por aula.
 */
public record AsignarPersonalControlRequest(@NotNull @Size(max = 20) List<Integer> idUsuarios, Map<Integer, Integer> aulas) {
    public AsignarPersonalControlRequest(List<Integer> idUsuarios) {
        this(idUsuarios, null);
    }
}
