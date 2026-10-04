package com.nexacore.examenes.exceptions;

/** El usuario de la ruta no existe. Responde 404. */
public class UsuarioNoEncontradoException extends RuntimeException {

    public UsuarioNoEncontradoException(Integer id) {
        super("No se encontró el usuario " + id);
    }
}
