package com.nexacore.examenes.dto;

/**
 * Respuesta tras crear un usuario exitosamente (201 Created).
 */
public record RegisterUserResponse(
        Integer id,
        String nombre,
        String email,
        String rol,
        String mensaje
) {}
