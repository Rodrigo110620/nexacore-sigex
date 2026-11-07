package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Sección 22, paso «Revisar»: lo que pasaría al importar el archivo, sin guardar nada. {@code listas}: filas que se
 * importarán; {@code conErrores}: filas que no se importan por un error (detalle en {@code errores}); {@code yaRegistradas}:
 * estudiantes cuyo código SIS, CI o correo ya está en el sistema (se omiten).
 */
public record RevisionImportacionResponse(
        String archivo, String tipo, int filas, int listas, int conErrores, int yaRegistradas, List<ErrorFila> errores) {

    /** Un error de una fila: número de fila como en Excel (la 1 es el encabezado), columna y mensaje. */
    public record ErrorFila(int fila, String columna, String mensaje) {}
}
