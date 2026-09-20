package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando el rol enviado no es ADMIN, DOCENTE o CONTROL,
 * o no existe en la tabla rol.
 */
public class RolInvalidoException extends RuntimeException {

    public RolInvalidoException(String rol) {
        super("El rol '" + rol + "' no existe en el sistema");
    }
}
