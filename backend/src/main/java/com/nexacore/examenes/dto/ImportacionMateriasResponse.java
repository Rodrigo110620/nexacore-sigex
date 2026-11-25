package com.nexacore.examenes.dto;

import java.util.List;

/** Resultado de importar materias: cuántas se crearon, las siglas que ya existían y los errores por fila. */
public record ImportacionMateriasResponse(int creadas, List<String> existentes, List<String> errores) {}
