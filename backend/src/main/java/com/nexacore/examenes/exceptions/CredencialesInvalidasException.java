package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando el email no existe o la contrasena no coincide.
 * El GlobalExceptionHandler la traduce a 401 Unauthorized.
 *
 * El mensaje es deliberadamente generico (no dice si fallo el email
 * o la contrasena) para no ayudar a quien intente adivinar cuentas.
 * Texto tomado de los criterios de aceptacion de la HU AUTH-02.
 */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException() {
        super("Usuario o contrasena incorrectos");
    }
}
