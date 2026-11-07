package com.nexacore.examenes.dto;

/**
 * Sección 22, pasos «Importando» y «Listo»: avance de una importación en curso. {@code estado}: EN_CURSO, LISTA o
 * FALLIDA; {@code resultado} llega cuando termina; {@code segundos}: lo que tardó.
 */
public record ProgresoImportacionResponse(
        String id, String estado, int procesadas, int total, ImportarEstudiantesResponse resultado, Long segundos, String error) {}
