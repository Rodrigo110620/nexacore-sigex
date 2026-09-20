package com.nexacore.examenes.dto;

/**
 * Respuesta tras crear un usuario exitosamente (201 Created).
 *
 * passwordTemporal siempre es null: la clave provisional se envía solo
 * por correo al usuario (Mailtrap / SMTP) y no se expone al administrador.
 */
public record RegisterUserResponse(
        Integer id,
        String nombre,
        String email,
        String rol,
        String passwordTemporal,
        String mensaje
) {}
