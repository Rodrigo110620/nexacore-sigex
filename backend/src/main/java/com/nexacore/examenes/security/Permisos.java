package com.nexacore.examenes.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.nexacore.examenes.security.Permiso.*;

/**
 * Resuelve los permisos de un usuario a partir de sus roles (ROLE_* leídos de la BD en cada petición).
 * Los roles del sistema (ADMIN, DOCENTE, CONTROL y ESTUDIANTE) tienen permisos fijos, los de siempre:
 * siempre existen y no se editan. Los roles extra que crea el ADMIN toman los suyos de la tabla
 * rol_permiso (V48), que carga PermisoService.
 */
public final class Permisos {

    public static final String ADMIN = "ADMIN";

    /** Permisos fijos de cada rol del sistema. */
    public static final Map<String, Set<Permiso>> POR_DEFECTO = Map.of(
            // Desde la V49 el DOCENTE asocia estudiantes en sus exámenes y ya no edita el registro de estudiantes.
            // El DOCENTE también descarga el acta y la asistencia, solo de sus exámenes (ExamenAccesoService.puedeExportar).
            "DOCENTE", EnumSet.of(EXAMENES_VER_PROPIOS, EXAMENES_GESTIONAR_PROPIOS, HABILITACION_VER, HABILITACION_GESTIONAR_PROPIOS,
                    CONTROL_INGRESO_PROPIOS, EXPULSAR_PROPIOS, ESTUDIANTES_VER, FOTOS_REPORTAR, REPORTES_EXPORTAR),
            // Desde la V53 el CONTROL recibe los avisos solo de los exámenes donde está asignado.
            "CONTROL", EnumSet.of(EXAMENES_VER_TODOS, HABILITACION_VER, CONTROL_INGRESO_TODOS, ESTUDIANTES_VER, FOTOS_REPORTAR),
            "ESTUDIANTE", EnumSet.noneOf(Permiso.class));

    /** Roles del sistema: siempre existen, no se borran y sus permisos son fijos. */
    public static final Set<String> DEL_SISTEMA = Set.of(ADMIN, "DOCENTE", "CONTROL", "ESTUDIANTE");

    /** Permisos de los roles extra; lo reemplaza PermisoService al cargar o editar la tabla. */
    private static volatile Function<String, Set<String>> fuente = rol -> Set.of();

    private Permisos() {
    }

    public static void usarFuente(Function<String, Set<String>> nueva) {
        fuente = nueva == null ? rol -> Set.of() : nueva;
    }

    public static boolean esDelSistema(String rol) {
        return DEL_SISTEMA.contains(rol);
    }

    /**
     * El ADMIN administra: tiene todos los permisos menos programar exámenes (los registra cada DOCENTE) y
     * registrar el control de ingreso (lo hace el CONTROL asignado). Supervisa el control con REPORTES_VER.
     * Quien además es DOCENTE o CONTROL los recibe por ese rol.
     */
    public static Set<String> delAdmin() {
        Set<String> res = new HashSet<>(todos());
        res.remove(Permiso.EXAMENES_GESTIONAR_PROPIOS.name());
        res.remove(Permiso.CONTROL_INGRESO_TODOS.name());
        res.remove(Permiso.CONTROL_INGRESO_PROPIOS.name());
        return res;
    }

    public static Set<String> porDefecto(String rol) {
        if (ADMIN.equals(rol)) return delAdmin();
        return POR_DEFECTO.getOrDefault(rol, Set.of()).stream().map(Enum::name).collect(Collectors.toSet());
    }

    public static Set<String> todos() {
        return Arrays.stream(Permiso.values()).map(Enum::name).collect(Collectors.toSet());
    }

    /** Permisos de un conjunto de roles (sin el prefijo ROLE_). */
    public static Set<String> deRoles(Collection<String> roles) {
        Set<String> res = new HashSet<>();
        for (String rol : roles) {
            res.addAll(esDelSistema(rol) ? porDefecto(rol) : fuente.apply(rol));
        }
        return res;
    }

    public static Set<String> de(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return Set.of();
        List<String> roles = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_")).map(a -> a.substring(5)).toList();
        return deRoles(roles);
    }

    public static boolean tiene(Authentication auth, Permiso permiso) {
        return de(auth).contains(permiso.name());
    }

    public static boolean alguno(Authentication auth, Permiso... permisos) {
        Set<String> suyos = de(auth);
        for (Permiso p : permisos) if (suyos.contains(p.name())) return true;
        return false;
    }

    /** Del usuario de la petición actual. */
    public static boolean tiene(Permiso permiso) {
        return tiene(SecurityContextHolder.getContext().getAuthentication(), permiso);
    }
}
