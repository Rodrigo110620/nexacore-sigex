package com.nexacore.examenes.dto;

import java.util.List;

/** Un rol con sus permisos, para la pantalla Configuración → Roles y permisos. */
public record RolConPermisosResponse(
        Integer id,
        String nombre,
        String descripcion,
        /** ADMIN, DOCENTE y CONTROL: siempre existen, no se borran y sus permisos no se editan. */
        boolean delSistema,
        List<String> permisos,
        long usuarios
) {}
