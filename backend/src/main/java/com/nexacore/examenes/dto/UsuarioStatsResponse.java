package com.nexacore.examenes.dto;

/**
 * Estadísticas agregadas de usuarios del sistema (HU#2).
 * Usado por el panel de administración para mostrar contadores.
 */
public record UsuarioStatsResponse(
        long totalUsuarios,
        long administradores,
        long docentes,
        long personalControl,
        long activos,
        long inactivos
) {}