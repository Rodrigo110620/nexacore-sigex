package com.nexacore.examenes.dto;

/** Estudiante del grupo que ya tiene otro examen que se cruza con el horario elegido (solo aviso). */
public record CruceEstudianteResponse(Integer idEstudiante, String codigoSis, String nombre, String otrosExamenes) {}
