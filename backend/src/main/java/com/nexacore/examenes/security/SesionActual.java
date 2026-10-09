package com.nexacore.examenes.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
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
     * true si el usuario es DOCENTE sin ser ADMIN ni CONTROL: solo puede ver los
     * exámenes que tiene asignados.
     */
    public static boolean esSoloDocente() {
        return tieneRol("ROLE_DOCENTE") && !tieneRol("ROLE_ADMIN") && !tieneRol("ROLE_CONTROL");
    }

    private static boolean tieneRol(String rol) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (rol.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
