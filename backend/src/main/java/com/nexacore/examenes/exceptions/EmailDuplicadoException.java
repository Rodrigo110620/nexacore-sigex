package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando el email ya existe en la tabla usuario.
 * El GlobalExceptionHandler la traduce a 409 Conflict.
 */
public class EmailDuplicadoException extends RuntimeException {

    public EmailDuplicadoException(String email) {
        super("El email '" + email + "' ya esta registrado");
    }
}
