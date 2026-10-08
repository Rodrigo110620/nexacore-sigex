package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando no se pudo enviar el correo con la contraseña temporal.
 * Revierte el registro: un usuario sin su contraseña no podría ingresar.
 * El GlobalExceptionHandler la traduce a 503 Service Unavailable.
 */
public class CorreoNoEnviadoException extends RuntimeException {
    public CorreoNoEnviadoException(String email) {
        super("No se pudo enviar el correo con la contraseña temporal a '" + email
                + "'. El usuario no fue registrado; revisa la configuración de correo e intenta de nuevo.");
    }
}
