package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando el CI ya pertenece a otro usuario.
 * El GlobalExceptionHandler la traduce a 409 Conflict.
 */
public class CiDuplicadoException extends RuntimeException {
    public CiDuplicadoException(String ci) {
        super("El CI '" + ci + "' ya esta registrado");
    }
}
