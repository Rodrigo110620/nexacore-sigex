package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando el CI ya pertenece a otro usuario.
 * El GlobalExceptionHandler la traduce a 409 Conflict.
 */
public class CiDuplicadoException extends RuntimeException {
    public CiDuplicadoException(String ci) {
        super("El CI '" + ci + "' ya esta registrado");
    }

    /** Con otro mensaje (p. ej. cuando el CI es de un estudiante). */
    public static CiDuplicadoException conMensaje(String mensaje) {
        return new CiDuplicadoException(mensaje, true);
    }

    private CiDuplicadoException(String mensaje, boolean literal) {
        super(mensaje);
    }
}
