package com.nexacore.examenes.dto;

import java.util.List;

/**
 * Perfil del usuario autenticado (sin password).
 */
public record PerfilResponse(
        Integer id,
        String nombre,
        String apellidos,
        String ci,
        String email,
        String estado,
        List<String> roles,
        /** Permisos del usuario según sus roles (Configuración → Roles y permisos). */
        List<String> permisos
) {
    public PerfilResponse(Integer id, String nombre, String apellidos, String ci, String email, String estado, List<String> roles) {
        this(id, nombre, apellidos, ci, email, estado, roles,
                com.nexacore.examenes.security.Permisos.deRoles(roles).stream().sorted().toList());
    }
}
