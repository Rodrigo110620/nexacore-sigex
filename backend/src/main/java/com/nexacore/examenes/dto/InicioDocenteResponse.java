package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Panel de inicio del DOCENTE (secciones 15 y 18 del diseño): sus materias con sus grupos y estudiantes, los totales,
 * los ingresos y expulsiones de hoy por hora en sus exámenes y sus últimos registros. Solo lo suyo.
 */
public record InicioDocenteResponse(
        LocalDateTime ahora,
        List<Materia> materias,
        int grupos,
        int estudiantes,
        int expulsionesHoy,
        int[] ingresosPorHora,
        int[] expulsionesPorHora,
        List<Registro> recientes) {

    /**
     * Una materia asignada: sus grupos, cuántos estudiantes inscritos tiene, su próximo examen (de hoy en adelante,
     * aún sin terminar) y la asistencia de sus exámenes ya realizados (null si todavía no tuvo ninguno).
     */
    public record Materia(Integer idMateria, String sigla, String nombre, List<String> grupos, int estudiantes,
                          ProximoExamen proximoExamen, Integer asistencia) {}

    public record ProximoExamen(Integer idExamen, LocalDate fecha, LocalTime horaInicio, int duracionMinutos) {}

    /** tipo: INGRESO, EXPULSION o INTENTO. detalle: aula, motivo u observación. */
    public record Registro(LocalDateTime fecha, String tipo, String estudiante, String materia, String detalle) {}
}
