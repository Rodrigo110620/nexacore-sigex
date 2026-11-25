package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record ReporteUsoAmbienteResponse(
    Integer idExamen,
    String ambiente,
    String docente,
    String materiaGrupo,
    LocalDate fecha,
    LocalTime horaInicio,
    Integer ingresos,
    boolean utilizado
) {}