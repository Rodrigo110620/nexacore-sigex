package com.nexacore.examenes.dto;

/** Totales de "Control del examen" (HU ACCS-01); habilitados + noHabilitados = total. */
public record ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados) {}
