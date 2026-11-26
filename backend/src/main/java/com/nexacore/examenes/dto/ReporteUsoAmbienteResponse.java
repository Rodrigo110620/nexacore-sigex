package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Un aula reservada para un examen y su uso. {@code estado}: UTILIZADO (entró al menos uno), SIN_USO (el examen ya
 * terminó y no entró nadie) o PENDIENTE (todavía no termina: aún no se puede decir si se usó).
 */
public record ReporteUsoAmbienteResponse(
    Integer idExamen,
    String ambiente,
    Integer capacidad,
    String docente,
    String materia,
    String grupo,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    Integer ingresos,
    boolean utilizado,
    String estado
) {}
