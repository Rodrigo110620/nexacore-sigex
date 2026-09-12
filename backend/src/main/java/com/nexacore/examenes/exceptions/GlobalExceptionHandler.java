package com.nexacore.examenes.exceptions;

import com.nexacore.examenes.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Traduce las excepciones de la aplicacion a respuestas HTTP uniformes.
 *
 * 400 Bad Request  -> validaciones fallidas o cuerpo JSON ausente/malformado
 * 401 Unauthorized -> credenciales incorrectas o cuenta inactiva
 *
 * Tarea B4 - Sprint 1.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Falla alguna anotacion de validacion del LoginRequest. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> manejarValidaciones(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errores.put(error.getField(), error.getDefaultMessage()));

        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Los datos enviados no son validos",
                errores);

        return ResponseEntity.badRequest().body(cuerpo);
    }

    /**
     * La peticion llego sin cuerpo o con JSON malformado.
     * Importante: esto debe responder 400 y no 401, porque el test
     * loginPathIsNotRejectedBySecurity de Aaron llama a /auth/login sin cuerpo.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> manejarCuerpoIlegible(HttpMessageNotReadableException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "El cuerpo de la peticion es obligatorio y debe ser un JSON valido");

        return ResponseEntity.badRequest().body(cuerpo);
    }

    /** Email inexistente o contrasena incorrecta. */
    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorResponse> manejarCredenciales(CredencialesInvalidasException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                ex.getMessage());

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(cuerpo);
    }

    /** Credenciales correctas pero cuenta deshabilitada. */
    @ExceptionHandler(CuentaInactivaException.class)
    public ResponseEntity<ErrorResponse> manejarCuentaInactiva(CuentaInactivaException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                ex.getMessage());

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(cuerpo);
    }
}
