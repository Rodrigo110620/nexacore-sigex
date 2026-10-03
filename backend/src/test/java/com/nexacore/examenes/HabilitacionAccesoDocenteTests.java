package com.nexacore.examenes;

import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.InscripcionParaleloRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.HabilitacionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Un DOCENTE solo puede ver la habilitación de los exámenes que tiene asignados. */
@ExtendWith(MockitoExtension.class)
class HabilitacionAccesoDocenteTests {

    private static final int EXAMEN = 7;
    private static final int PARALELO = 2;
    private static final int DOCENTE_DEL_EXAMEN = 20;

    @Mock AsistenciaExamenRepository asistenciaRepository;
    @Mock EstudianteRepository estudianteRepository;
    @Mock EstudianteCarreraRepository estudianteCarreraRepository;
    @Mock ExamenRepository examenRepository;
    @Mock InscripcionParaleloRepository inscripcionParaleloRepository;
    @Mock UsuarioRepository usuarioRepository;

    HabilitacionService service;

    @BeforeEach
    void preparar() {
        service = new HabilitacionService(asistenciaRepository, estudianteRepository, estudianteCarreraRepository,
                examenRepository, inscripcionParaleloRepository, usuarioRepository);
        ExamenId id = new ExamenId();
        id.setIdExamen(EXAMEN);
        id.setIdParalelo(PARALELO);
        Examen examen = new Examen();
        examen.setId(id);
        examen.setIdDocente(DOCENTE_DEL_EXAMEN);
        when(examenRepository.findById(any())).thenReturn(Optional.of(examen));
    }

    @AfterEach
    void limpiarSesion() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void elDocenteAsignadoPuedeVerLaHabilitacion() {
        iniciarSesion("ana@umss.edu.bo", "DOCENTE");
        when(usuarioRepository.findByEmail("ana@umss.edu.bo")).thenReturn(Optional.of(usuario(DOCENTE_DEL_EXAMEN)));
        when(asistenciaRepository.listarDelExamen(EXAMEN, PARALELO)).thenReturn(List.of());

        assertThat(service.listar(EXAMEN, PARALELO)).isEmpty();
    }

    @Test
    void otroDocenteNoPuedeVerLaHabilitacion() {
        iniciarSesion("luis@umss.edu.bo", "DOCENTE");
        when(usuarioRepository.findByEmail("luis@umss.edu.bo")).thenReturn(Optional.of(usuario(21)));

        assertThatThrownBy(() -> service.listar(EXAMEN, PARALELO)).isInstanceOf(AccessDeniedException.class);
        verify(asistenciaRepository, never()).listarDelExamen(any(), any());
    }

    @Test
    void controlYAdminVenLaHabilitacionDeCualquierExamen() {
        when(asistenciaRepository.listarDelExamen(EXAMEN, PARALELO)).thenReturn(List.of());

        iniciarSesion("control@umss.edu.bo", "CONTROL");
        assertThat(service.listar(EXAMEN, PARALELO)).isEmpty();
        iniciarSesion("admin@umss.edu.bo", "ADMIN", "DOCENTE");
        assertThat(service.listar(EXAMEN, PARALELO)).isEmpty();
        verify(usuarioRepository, never()).findByEmail(any());
    }

    private static void iniciarSesion(String email, String... roles) {
        List<SimpleGrantedAuthority> authorities = java.util.Arrays.stream(roles)
                .map(rol -> new SimpleGrantedAuthority("ROLE_" + rol))
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, authorities));
    }

    private static Usuario usuario(int id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }
}
