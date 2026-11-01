package com.nexacore.examenes.services;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Qué estudiantes puede ver el usuario. El ADMIN, el CONTROL y los roles extra con ESTUDIANTES_VER ven a
 * todos; el DOCENTE (que solo ve sus exámenes) ve a los inscritos en sus paralelos o asociados a sus
 * exámenes. Para asociar estudiantes a uno de sus exámenes sí busca entre todos.
 */
@Service("estudianteAlcance")
public class EstudianteAlcanceService {

    private final EstudianteRepository estudianteRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenAccesoService examenAccesoService;

    public EstudianteAlcanceService(EstudianteRepository estudianteRepository, UsuarioRepository usuarioRepository,
                                    ExamenAccesoService examenAccesoService) {
        this.estudianteRepository = estudianteRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenAccesoService = examenAccesoService;
    }

    /**
     * Docente por el que hay que filtrar el listado, o null si ve a todos. Con {@code idExamen} (buscar a
     * quién asociar) no se filtra, pero solo si puede gestionar la habilitación de ese examen.
     */
    public Integer docenteParaFiltrar(Integer idExamen, Authentication authentication) {
        if (!SesionActual.esSoloDocente()) return null;
        if (idExamen != null) {
            if (!examenAccesoService.puedeGestionarHabilitacion(idExamen, authentication)) {
                throw new AccessDeniedException("No puedes asociar estudiantes a este examen.");
            }
            return null;
        }
        return idUsuario(authentication);
    }

    /** Ver la ficha o la foto de un estudiante. */
    public boolean puedeVer(Integer idEstudiante, Authentication authentication) {
        if (!SesionActual.esSoloDocente()) return true;
        Integer idDocente = idUsuario(authentication);
        return idEstudiante != null && idDocente != null && estudianteRepository.esDelDocente(idEstudiante, idDocente);
    }

    private Integer idUsuario(Authentication authentication) {
        if (authentication == null) throw new AccessDeniedException("Sin sesión.");
        return usuarioRepository.findByEmail(authentication.getName()).map(Usuario::getId)
                .orElseThrow(() -> new AccessDeniedException("Usuario no encontrado."));
    }
}
