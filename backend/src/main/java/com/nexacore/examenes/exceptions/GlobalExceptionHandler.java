package com.nexacore.examenes.exceptions;

import com.nexacore.examenes.dto.ErrorResponse;
import com.nexacore.examenes.exceptions.RolDuplicadoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
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

    /** Email ya registrado en la base de datos (HU#2). */
    @ExceptionHandler(EmailDuplicadoException.class)
    public ResponseEntity<ErrorResponse> manejarEmailDuplicado(EmailDuplicadoException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT).body(cuerpo);
    }

    /** Rol duplicado al intentar crear uno nuevo. */
    @ExceptionHandler(RolDuplicadoException.class)
    public ResponseEntity<ErrorResponse> manejarRolDuplicado(RolDuplicadoException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT).body(cuerpo);
    }

    /** Rol enviado no existe o no esta permitido (HU#2). */
    @ExceptionHandler(RolInvalidoException.class)
    public ResponseEntity<ErrorResponse> manejarRolInvalido(RolInvalidoException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());

        return ResponseEntity.badRequest().body(cuerpo);
    }

    /** Contraseña actual incorrecta al cambiarla. */
    @ExceptionHandler(PasswordActualIncorrectaException.class)
    public ResponseEntity<ErrorResponse> manejarPasswordActual(PasswordActualIncorrectaException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(cuerpo);
    }

    /** Confirmación de nueva contraseña no coincide. */
    @ExceptionHandler(PasswordConfirmacionException.class)
    public ResponseEntity<ErrorResponse> manejarPasswordConfirmacion(PasswordConfirmacionException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(cuerpo);
    }

    /** Token de reset inválido, expirado o ya usado. */
    @ExceptionHandler(TokenResetInvalidoException.class)
    public ResponseEntity<ErrorResponse> manejarTokenReset(TokenResetInvalidoException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(cuerpo);
    }

    /** Errores de negocio simples (ej. nueva igual a la actual). */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> manejarArgumentoInvalido(IllegalArgumentException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(cuerpo);
    }

    /** Usuario autenticado pero sin permisos suficientes (403). */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> manejarAccesoDenegado(AccessDeniedException ex) {
        ErrorResponse cuerpo = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "No tienes permisos para realizar esta accion");

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(cuerpo);
    }
}
