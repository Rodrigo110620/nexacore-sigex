package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Lo propio de cada rol para Mi perfil: qué puede hacer (permisos), los datos del DOCENTE con sus materias y grupos,
 * y los exámenes asignados al CONTROL. Lo que no aplica al usuario llega null.
 */
public record PerfilRolResponse(List<PermisoPerfil> permisos, DatosDocente docente, List<ExamenAsignado> examenesAsignados,
                                /** Ruta de su foto de perfil (opcional, V54), o null si no tiene. */
                                String fotoUrl) {

    public record PermisoPerfil(String codigo, String modulo, String descripcion) {}

    public record DatosDocente(String titulo, String especialidad, String categoria, List<MateriaDocente> materias) {}

    public record MateriaDocente(Integer idMateria, String sigla, String nombre, List<String> grupos) {}

    /** Exámenes de hoy en adelante donde está asignado como personal de control (V53). */
    public record ExamenAsignado(Integer idExamen, String materia, LocalDate fecha, LocalTime horaInicio, Integer duracionMinutos,
                                 String aula, String estado) {}
}
