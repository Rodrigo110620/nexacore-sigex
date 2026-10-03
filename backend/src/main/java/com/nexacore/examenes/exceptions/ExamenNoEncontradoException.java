package com.nexacore.examenes.exceptions;

/** El examen indicado en la ruta no existe. Responde 404. */
public class ExamenNoEncontradoException extends RuntimeException {

    public ExamenNoEncontradoException(Integer idExamen) {
        super("No se encontró el examen " + idExamen);
    }
}
