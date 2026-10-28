package com.nexacore.examenes.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Consultas sobre el usuario autenticado en la petición actual. */
public final class SesionActual {

    private SesionActual() {
    }

    /** Email del usuario autenticado, o null si no hay sesión. */
    public static String email() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? null : auth.getName();
    }

    /**
     * true si solo ve los exámenes que tiene asignados como docente (EXAMENES_VER_PROPIOS sin poder ver
     * todos). El DOCENTE, sí; quien además es ADMIN o CONTROL, no.
     */
    public static boolean esSoloDocente() {
        return Permisos.tiene(Permiso.EXAMENES_VER_PROPIOS)
                && !Permisos.tiene(Permiso.EXAMENES_VER_TODOS) && !Permisos.tiene(Permiso.REPORTES_VER);
    }

    /** true si solo gestiona sus propios exámenes (no puede crearlos ni pasarlos a nombre de otro docente). */
    public static boolean gestionaSoloPropios() {
        return Permisos.tiene(Permiso.EXAMENES_GESTIONAR_PROPIOS) && !Permisos.tiene(Permiso.EXAMENES_GESTIONAR_TODOS);
    }

}
