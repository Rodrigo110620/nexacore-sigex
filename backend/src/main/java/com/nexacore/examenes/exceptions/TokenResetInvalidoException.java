package com.nexacore.examenes.exceptions;

/**
 * Token de restablecimiento inválido, expirado o ya usado.
 */
public class TokenResetInvalidoException extends RuntimeException {

    public TokenResetInvalidoException() {
        super("El enlace de restablecimiento no es válido o ya expiró. Solicita uno nuevo.");
    }
}
