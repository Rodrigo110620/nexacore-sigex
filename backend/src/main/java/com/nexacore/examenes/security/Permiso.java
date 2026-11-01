package com.nexacore.examenes.security;

/**
 * Catálogo de permisos de SIGEX. Cada ruta pide un permiso (no un rol), y cada rol tiene los suyos en
 * la tabla rol_permiso (V48). Los cuatro roles del sistema vienen con lo que podían hacer antes.
 * Los "_PROPIOS" valen solo para los exámenes del usuario como docente.
 */
public enum Permiso {
    EXAMENES_VER_TODOS("Exámenes", "Ver todos los exámenes"),
    EXAMENES_VER_PROPIOS("Exámenes", "Ver solo los exámenes que tiene asignados como docente"),
    EXAMENES_GESTIONAR_TODOS("Exámenes", "Crear, editar y reprogramar cualquier examen"),
    EXAMENES_GESTIONAR_PROPIOS("Exámenes", "Crear, editar y reprogramar sus propios exámenes"),
    EXAMENES_CANCELAR("Exámenes", "Cancelar exámenes"),
    AMBIENTES_GESTIONAR("Exámenes", "Crear ambientes y cambiar su aforo"),
    HABILITACION_VER("Habilitación", "Ver los estudiantes asociados a un examen y su habilitación"),
    HABILITACION_GESTIONAR("Habilitación", "Asociar estudiantes y cambiar su habilitación en cualquier examen"),
    HABILITACION_GESTIONAR_PROPIOS("Habilitación", "Asociar estudiantes y cambiar su habilitación en sus propios exámenes"),
    CONTROL_INGRESO_TODOS("Control de ingreso", "Registrar ingresos e incidencias en cualquier examen"),
    CONTROL_INGRESO_PROPIOS("Control de ingreso", "Registrar ingresos e incidencias en sus propios exámenes"),
    EXPULSAR_TODOS("Control de ingreso", "Expulsar y anular expulsiones en cualquier examen"),
    EXPULSAR_PROPIOS("Control de ingreso", "Expulsar y anular expulsiones en sus propios exámenes"),
    ESTUDIANTES_VER("Estudiantes", "Ver estudiantes"),
    ESTUDIANTES_GESTIONAR("Estudiantes", "Registrar, editar e importar estudiantes y regenerar su QR"),
    FOTOS_REPORTAR("Estudiantes", "Reportar una foto que no coincide con la persona"),
    FOTOS_REVISAR("Estudiantes", "Revisar, aprobar y rechazar fotos"),
    REPORTES_VER("Reportes", "Ver los reportes de intentos, expulsiones y excepciones"),
    NOTIFICACIONES_TODAS("Reportes", "Recibir los avisos de todos los exámenes"),
    USUARIOS_GESTIONAR("Administración", "Gestionar los usuarios del personal"),
    ROLES_GESTIONAR("Administración", "Crear roles y asignar sus permisos");

    private final String modulo;
    private final String descripcion;

    Permiso(String modulo, String descripcion) {
        this.modulo = modulo;
        this.descripcion = descripcion;
    }

    public String modulo() { return modulo; }
    public String descripcion() { return descripcion; }

    /**
     * Solo el ADMIN los tiene: no se asignan a un rol extra. Si un auxiliar pudiera gestionar usuarios o
     * roles, podría darse a sí mismo el rol ADMIN.
     */
    public boolean soloAdmin() {
        return this == USUARIOS_GESTIONAR || this == ROLES_GESTIONAR;
    }

    public static boolean existe(String codigo) {
        for (Permiso p : values()) if (p.name().equals(codigo)) return true;
        return false;
    }
}
