package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Panel de inicio del ADMIN: el resumen del día y las tendencias de la última semana, en una sola
 * respuesta. Los datos de cada examen (materia, horario, aulas) los da GET /examenes.
 */
public record InicioAdminResponse(
        LocalDateTime ahora,
        Hoy hoy,
        List<ExamenHoy> examenes,
        /** Ingresos registrados hoy por hora (índice 0 a 23). */
        int[] ingresosPorHora,
        /** Habilitados que aún no ingresan a los exámenes que no empezaron, por la hora de inicio. */
        int[] esperadosPorHora,
        /** Los últimos 7 días, del más antiguo a hoy. */
        List<Dia> dias,
        /** Intentos de ingreso incorrectos de los últimos 7 días por motivo, de mayor a menor. */
        List<Motivo> motivos,
        Pendientes pendientes) {

    /** asociados = habilitados y no; porIngresar en exámenes que no empezaron; ausentes en los ya iniciados. */
    public record Hoy(int examenes, int enCurso, int asociados, int ingresados, int porIngresar, int ausentes, int incidencias) {}

    public record ExamenHoy(int idExamen, int asociados, int habilitados, int ingresados) {}

    public record Dia(LocalDate fecha, int asociados, int ingresados, int ausentes, int incidencias) {}

    public record Motivo(String motivo, int cantidad) {}

    public record Pendientes(int fotos, int qrDuplicados, int intentosHoy) {}
}
