package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Resultado de la importación masiva de estudiantes.
 * "errores" trae una línea por fila no importada, con su número de fila.
 */
public record ImportarEstudiantesResponse(
    int insertados,
    int ignorados,
    List<String> errores
) {}
