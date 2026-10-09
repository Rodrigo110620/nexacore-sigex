package com.nexacore.examenes.services;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Resuelve el acceso operativo a un examen sin exponer controles de otros docentes. */
@Service("examenAccesoService")
public class ExamenAccesoService {
    private final ExamenRepository examenRepository;
    private final UsuarioRepository usuarioRepository;

    public ExamenAccesoService(ExamenRepository examenRepository, UsuarioRepository usuarioRepository) {
        this.examenRepository = examenRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public boolean puedeControlar(Integer idExamen, Authentication authentication) {
        if (idExamen == null || authentication == null || !authentication.isAuthenticated()) return false;
        if (tieneRol(authentication, "ROLE_ADMIN") || tieneRol(authentication, "ROLE_CONTROL")) return true;
        if (!tieneRol(authentication, "ROLE_DOCENTE")) return false;
        return usuarioRepository.findByEmail(authentication.getName())
                .map(Usuario::getId)
                .map(idDocente -> examenRepository.perteneceADocente(idExamen, idDocente))
                .orElse(false);
    }

    private boolean tieneRol(Authentication authentication, String rol) {
        return authentication.getAuthorities().stream().anyMatch(a -> rol.equals(a.getAuthority()));
    }
}
