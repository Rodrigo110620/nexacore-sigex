package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Respuesta del login exitoso (200 OK).
 *
 * Contiene exactamente lo que pide la tarjeta B4: token, nombre y roles.
 * El frontend (F3/F4) usa el token para las siguientes peticiones
 * y los roles para decidir a que pantalla entra el usuario.
 *
 * Tarea B4 - Sprint 1.
 */
public record AuthResponse(
        String token,
        String nombre,
        List<String> roles
) {
}
