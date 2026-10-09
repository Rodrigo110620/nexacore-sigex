package com.nexacore.examenes.exceptions;

/**
 * Se lanza cuando la cuenta está bloqueada temporalmente por intentos
 * fallidos consecutivos (HU AUTH-02). Responde 423 Locked.
 */
public class CuentaBloqueadaException extends RuntimeException {

    public CuentaBloqueadaException(long minutosRestantes) {
        super("Cuenta bloqueada temporalmente por intentos fallidos. Intente nuevamente en "
                + minutosRestantes + (minutosRestantes == 1 ? " minuto." : " minutos."));
    }
}
