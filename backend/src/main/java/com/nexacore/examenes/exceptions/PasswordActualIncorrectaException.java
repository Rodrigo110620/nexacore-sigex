package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando la contraseña actual no coincide al intentar cambiarla.
 */
public class PasswordActualIncorrectaException extends RuntimeException {
    public PasswordActualIncorrectaException() {
        super("La contraseña actual es incorrecta");
    }
}
