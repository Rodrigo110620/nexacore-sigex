package com.nexacore.examenes.dto;

/**
 * Respuesta tras crear un usuario exitosamente (201 Created).
 *
 * passwordTemporal: clave provisional generada automáticamente por el sistema.
 * El admin debe entregarla al usuario para su primer acceso.
 * Sprint 2+: reemplazar por envío de email con la clave.
 */
public record RegisterUserResponse(
        Integer id,
        String nombre,
        String email,
        String rol,
        String passwordTemporal,
        String mensaje
) {}
