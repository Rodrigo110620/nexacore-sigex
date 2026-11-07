package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DASH-02 (sección 11, «Ingresos recientes»): los últimos ingresos del examen en la sesión actual, del más reciente al
 * más antiguo, y cuántos ingresaron en total. expulsado: entró y luego fue expulsado (se muestra con su marca).
 */
public record IngresosRecientesResponse(long total, List<Ingreso> ingresos) {

    public record Ingreso(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String fotoUrl,
                          LocalDateTime fechaHoraIngreso, String aula, boolean expulsado) {}
}
