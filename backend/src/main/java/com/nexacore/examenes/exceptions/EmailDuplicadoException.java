package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando el email ya existe en la tabla usuario.
 * El GlobalExceptionHandler la traduce a 409 Conflict.
 */
public class EmailDuplicadoException extends RuntimeException {

    public EmailDuplicadoException(String email) {
        super("El email '" + email + "' ya esta registrado");
    }

    /** Con otro mensaje (p. ej. cuando el correo es de un estudiante). */
    public static EmailDuplicadoException conMensaje(String mensaje) {
        return new EmailDuplicadoException(mensaje, true);
    }

    private EmailDuplicadoException(String mensaje, boolean literal) {
        super(mensaje);
    }
}
