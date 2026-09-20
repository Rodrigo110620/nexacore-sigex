package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando la nueva contraseña y su confirmación no coinciden.
 */
public class PasswordConfirmacionException extends RuntimeException {
    public PasswordConfirmacionException() {
        super("La nueva contraseña y la confirmación no coinciden");
    }
}
