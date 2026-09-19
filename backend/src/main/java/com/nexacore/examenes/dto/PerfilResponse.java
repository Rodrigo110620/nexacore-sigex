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
        List<String> roles
) {}
