package com.nexacore.examenes.exceptions;

import org.springframework.http.HttpStatus;

public class ControlIngresoException extends RuntimeException {
    private final HttpStatus status;

    public ControlIngresoException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
