package com.nexacore.examenes;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.EstudianteAlcanceService;
import com.nexacore.examenes.services.ExamenAccesoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** El DOCENTE ve a los estudiantes de sus paralelos y exámenes; para asociar en su examen, a todos. */
class EstudianteAlcanceServiceTests {

    private final EstudianteRepository estudiantes = mock(EstudianteRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final ExamenAccesoService examenes = mock(ExamenAccesoService.class);
    private final EstudianteAlcanceService alcance = new EstudianteAlcanceService(estudiantes, usuarios, examenes);

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private Authentication sesion(String email, String rol) {
        Authentication auth = new UsernamePasswordAuthenticationToken(email, null, List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
        SecurityContextHolder.getContext().setAuthentication(auth);
        return auth;
    }

    private void usuario(String email, int id) {
        Usuario u = new Usuario();
        u.setId(id);
        when(usuarios.findByEmail(email)).thenReturn(Optional.of(u));
    }

    @Test
    void elAdminYElControlVenATodos() {
        assertThat(alcance.docenteParaFiltrar(null, sesion("admin@umss.edu", "ADMIN"))).isNull();
        assertThat(alcance.puedeVer(5, sesion("admin@umss.edu", "ADMIN"))).isTrue();
        assertThat(alcance.docenteParaFiltrar(null, sesion("control@umss.edu", "CONTROL"))).isNull();
        assertThat(alcance.puedeVer(5, sesion("control@umss.edu", "CONTROL"))).isTrue();
        verify(estudiantes, never()).esDelDocente(any(), any());
    }

    @Test
    void elDocenteSoloVeASusEstudiantes() {
        usuario("ana@umss.edu", 7);
        Authentication docente = sesion("ana@umss.edu", "DOCENTE");
        when(estudiantes.esDelDocente(5, 7)).thenReturn(true);
        when(estudiantes.esDelDocente(6, 7)).thenReturn(false);

        assertThat(alcance.docenteParaFiltrar(null, docente)).isEqualTo(7);
        assertThat(alcance.puedeVer(5, docente)).isTrue();
        assertThat(alcance.puedeVer(6, docente)).isFalse();
    }

    @Test
    void paraAsociarEnSuExamenElDocenteBuscaEntreTodos() {
        Authentication docente = sesion("ana@umss.edu", "DOCENTE");
        when(examenes.puedeGestionarHabilitacion(3, docente)).thenReturn(true);
        when(examenes.puedeGestionarHabilitacion(4, docente)).thenReturn(false);

        assertThat(alcance.docenteParaFiltrar(3, docente)).isNull();
        assertThatThrownBy(() -> alcance.docenteParaFiltrar(4, docente)).isInstanceOf(AccessDeniedException.class);
    }
}
