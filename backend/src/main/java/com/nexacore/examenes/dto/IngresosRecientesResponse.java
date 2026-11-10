package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DASH-02 (sección 11, «Ingresos recientes»): una fila por estudiante que ingresó en la sesión actual, con columnas
 * Ingreso · Salida · Estado, ordenadas por su actividad más reciente (ingreso, salida, expulsión o traslado).
 * total = estudiantes que ingresaron.
 */
public record IngresosRecientesResponse(long total, List<Fila> ingresos) {

    /**
     * salidaAlCierre: no marcó salida y el examen ya terminó: salió a la hora de fin. expulsion*: la última de la sesión
     * (anulada = se anuló por error). traslado*: el último, «608 → 690A».
     */
    public record Fila(Integer idEstudiante, String nombre, String apellidos, String codigoSis, String fotoUrl,
                       LocalDateTime fechaHoraIngreso, String aula,
                       LocalDateTime fechaHoraSalida, boolean salidaAlCierre,
                       LocalDateTime fechaHoraExpulsion, String motivoExpulsion, boolean expulsionAnulada,
                       LocalDateTime fechaHoraTraslado, String traslado) {}
}
