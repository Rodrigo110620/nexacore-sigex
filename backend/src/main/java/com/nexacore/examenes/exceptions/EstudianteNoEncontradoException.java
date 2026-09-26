package com.nexacore.examenes.exceptions;

/**
 * No existe ningún estudiante con el código universitario o CI buscado (HU ACCS-01).
 *
 * Responde 404. Es distinto de NO_VINCULADO, donde el estudiante sí existe
 * pero no está asignado al examen.
 */
public class EstudianteNoEncontradoException extends RuntimeException {

    public EstudianteNoEncontradoException(String campo, String valor) {
        super("No se encontró ningún estudiante con " + campo + " " + valor);
    }
}
