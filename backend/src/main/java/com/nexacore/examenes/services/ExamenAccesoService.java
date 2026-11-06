package com.nexacore.examenes.services;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.ExamenControlRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Resuelve el acceso operativo a un examen sin exponer controles de otros docentes. */
@Service("examenAccesoService")
public class ExamenAccesoService {
    private final ExamenRepository examenRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenControlRepository examenControlRepository;

    public ExamenAccesoService(ExamenRepository examenRepository, UsuarioRepository usuarioRepository,
                               ExamenControlRepository examenControlRepository) {
        this.examenRepository = examenRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenControlRepository = examenControlRepository;
    }

    /** Ver un examen: con EXAMENES_VER_TODOS cualquiera; con _PROPIOS, los suyos como docente. */
    public boolean puedeVer(Integer idExamen, Authentication authentication) {
        return segunPermiso(idExamen, authentication, Permiso.EXAMENES_VER_TODOS, Permiso.EXAMENES_VER_PROPIOS);
    }

    /** Ve los reportes de todos los exámenes (REPORTES_VER); si no, solo los de "sus" exámenes. */
    public boolean veTodosLosReportes(Authentication authentication) {
        return Permisos.tiene(authentication, Permiso.REPORTES_VER);
    }

    /**
     * "Sus" exámenes, para reportes y notificaciones: los que tiene como docente o en los que está asignado
     * como personal de control (V53). Controlar otro examen como reemplazo no lo vuelve suyo.
     */
    public boolean esMio(Integer idExamen, Authentication authentication) {
        Integer yo = idUsuario(authentication);
        return idExamen != null && yo != null
                && (examenRepository.perteneceADocente(idExamen, yo) || examenControlRepository.estaAsignado(idExamen, yo));
    }

    public Integer idUsuario(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        return usuarioRepository.findByEmail(authentication.getName()).map(Usuario::getId).orElse(null);
    }

    /** Registrar ingresos e incidencias: con CONTROL_INGRESO_TODOS en cualquiera; con _PROPIOS, en los suyos. */
    public boolean puedeControlar(Integer idExamen, Authentication authentication) {
        return segunPermiso(idExamen, authentication, Permiso.CONTROL_INGRESO_TODOS, Permiso.CONTROL_INGRESO_PROPIOS);
    }

    /** Reasignar está reservado al administrador o al docente titular del examen. */
    public boolean puedeReasignar(Integer idExamen, Authentication authentication) {
        if (idExamen == null || authentication == null || !authentication.isAuthenticated()) return false;
        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (admin) return true;
        boolean docente = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DOCENTE"));
        return docente && usuarioRepository.findByEmail(authentication.getName())
                .map(Usuario::getId).map(id -> examenRepository.perteneceADocente(idExamen, id)).orElse(false);
    }

    /** Ver los reportes de expulsiones y excepciones de un examen: quien lo controla o tiene REPORTES_VER. */
    public boolean puedeVerReportes(Integer idExamen, Authentication authentication) {
        return idExamen != null && (Permisos.tiene(authentication, Permiso.REPORTES_VER) || puedeControlar(idExamen, authentication));
    }

    /**
     * Editar un examen: con EXAMENES_GESTIONAR_TODOS cualquiera (ADMIN); con _PROPIOS solo los suyos
     * (DOCENTE). Un examen finalizado no se edita: se reprograma.
     */
    public boolean puedeEditar(Integer idExamen, Authentication authentication) {
        return puedeReprogramar(idExamen, authentication);
    }

    /**
     * Expulsar y anular expulsiones (INCI-01): con EXPULSAR_TODOS en cualquier examen (ADMIN); con
     * _PROPIOS solo en los suyos (DOCENTE). El personal de control no expulsa: reporta el incidente.
     */
    public boolean puedeExpulsar(Integer idExamen, Authentication authentication) {
        return segunPermiso(idExamen, authentication, Permiso.EXPULSAR_TODOS, Permiso.EXPULSAR_PROPIOS);
    }

    /**
     * Asociar, quitar y cambiar la habilitación de estudiantes: con HABILITACION_GESTIONAR en cualquier
     * examen (ADMIN); con _PROPIOS solo en los suyos (DOCENTE).
     */
    public boolean puedeGestionarHabilitacion(Integer idExamen, Authentication authentication) {
        return segunPermiso(idExamen, authentication, Permiso.HABILITACION_GESTIONAR, Permiso.HABILITACION_GESTIONAR_PROPIOS);
    }

    /** Reprogramar: con EXAMENES_GESTIONAR_TODOS cualquier examen; con _PROPIOS, los suyos. */
    public boolean puedeReprogramar(Integer idExamen, Authentication authentication) {
        return segunPermiso(idExamen, authentication, Permiso.EXAMENES_GESTIONAR_TODOS, Permiso.EXAMENES_GESTIONAR_PROPIOS);
    }

    /** El permiso "_TODOS" vale en cualquier examen; el "_PROPIOS", solo si el examen es del usuario como docente. */
    private boolean segunPermiso(Integer idExamen, Authentication authentication, Permiso todos, Permiso propios) {
        if (idExamen == null || authentication == null || !authentication.isAuthenticated()) return false;
        if (Permisos.tiene(authentication, todos)) return true;
        if (!Permisos.tiene(authentication, propios)) return false;
        return usuarioRepository.findByEmail(authentication.getName())
                .map(Usuario::getId)
                .map(idDocente -> examenRepository.perteneceADocente(idExamen, idDocente))
                .orElse(false);
    }
}
