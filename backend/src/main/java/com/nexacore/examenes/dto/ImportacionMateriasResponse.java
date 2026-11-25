package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Resultado de importar materias: cuántas se crearon, las siglas que se actualizaron (nombre o carreras), las que ya
 * estaban igual y los errores por fila.
 */
public record ImportacionMateriasResponse(int creadas, List<String> actualizadas, List<String> sinCambios, List<String> errores) {}
