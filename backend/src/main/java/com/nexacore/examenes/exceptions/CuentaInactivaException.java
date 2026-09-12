package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando las credenciales son correctas pero la cuenta
 * fue deshabilitada (estado != "activo").
 *
 * Responde 401 igual que las credenciales invalidas, pero con un
 * mensaje distinto, tal como pide la HU AUTH-02.
 */
public class CuentaInactivaException extends RuntimeException {

    public CuentaInactivaException() {
        super("La cuenta se encuentra inactiva. Contacte al administrador.");
    }
}
