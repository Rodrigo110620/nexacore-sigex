package com.nexacore.examenes.exceptions;

public class AmbienteDuplicadoException extends RuntimeException {
    public AmbienteDuplicadoException(String nombre) {
        super("Ya existe un ambiente con el nombre: " + nombre);
    }
}
