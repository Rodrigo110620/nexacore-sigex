package com.nexacore.examenes.dto;

import java.time.LocalDateTime;

/**
 * Fila del listado de usuarios para el ADMIN (tarea B1).
 *
 * Nunca incluye el password. Si el usuario no tiene rol asignado,
 * rol vale "SIN_ROL" para que el frontend no reciba nulos.
 * bloqueadoHasta es el fin del bloqueo por intentos fallidos, o null si no está bloqueado.
 */
public record UsuarioListResponse(
        Integer id,
        String nombre,
        String apellidos,
        String email,
        String ci,
        String rol,
        String estado,
        String titulo,
        LocalDateTime bloqueadoHasta,
        /** Ruta de su foto de perfil (V54), o null si no tiene: el listado la muestra en lugar de las iniciales. */
        String fotoUrl
) {
    public UsuarioListResponse(Integer id, String nombre, String apellidos, String email, String ci, String rol,
                               String estado, String titulo, LocalDateTime bloqueadoHasta) {
        this(id, nombre, apellidos, email, ci, rol, estado, titulo, bloqueadoHasta, null);
    }
}
