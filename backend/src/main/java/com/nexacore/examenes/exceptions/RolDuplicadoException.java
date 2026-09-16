package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando se intenta crear un rol con un nombre que ya existe.
 * El GlobalExceptionHandler la traduce a 409 Conflict.
 */
public class RolDuplicadoException extends RuntimeException {

    public RolDuplicadoException(String nombre) {
        super("El rol '" + nombre + "' ya existe en el sistema");
    }
}
