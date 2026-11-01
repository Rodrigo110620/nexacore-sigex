package com.nexacore.examenes;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.ExamenAccesoService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Reprogramar, expulsar, editar y asociar estudiantes: el ADMIN en cualquier examen; el DOCENTE solo en los suyos. */
class ReprogramarAccesoTests {

    private final ExamenRepository examenes = mock(ExamenRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final ExamenAccesoService acceso = new ExamenAccesoService(examenes, usuarios);

    private static Authentication sesion(String email, String rol) {
        return new UsernamePasswordAuthenticationToken(email, null, List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
    }

    private void docente(String email, int id) {
        Usuario u = new Usuario();
        u.setId(id);
        when(usuarios.findByEmail(email)).thenReturn(Optional.of(u));
    }

    @Test
    void elAdminYElDocenteDelExamenPuedenReprogramar() {
        docente("propio@umss.edu", 7);
        when(examenes.perteneceADocente(3, 7)).thenReturn(true);
        assertThat(acceso.puedeReprogramar(3, sesion("admin@umss.edu", "ADMIN"))).isTrue();
        assertThat(acceso.puedeReprogramar(3, sesion("propio@umss.edu", "DOCENTE"))).isTrue();
    }

    @Test
    void otroDocenteYElControlNoPueden() {
        docente("ajeno@umss.edu", 8);
        when(examenes.perteneceADocente(3, 8)).thenReturn(false);
        assertThat(acceso.puedeReprogramar(3, sesion("ajeno@umss.edu", "DOCENTE"))).isFalse();
        assertThat(acceso.puedeReprogramar(3, sesion("control@umss.edu", "CONTROL"))).isFalse();
        assertThat(acceso.puedeReprogramar(3, sesion("est@umss.edu", "ESTUDIANTE"))).isFalse();
    }

    // INCI-01: expulsa el ADMIN o el docente de su propio examen; el control reporta, no expulsa.
    @Test
    void elAdminYElDocenteDelExamenPuedenExpulsar() {
        docente("propio@umss.edu", 7);
        when(examenes.perteneceADocente(3, 7)).thenReturn(true);
        assertThat(acceso.puedeExpulsar(3, sesion("admin@umss.edu", "ADMIN"))).isTrue();
        assertThat(acceso.puedeExpulsar(3, sesion("propio@umss.edu", "DOCENTE"))).isTrue();
    }

    @Test
    void otroDocenteElControlYElEstudianteNoPuedenExpulsar() {
        docente("ajeno@umss.edu", 8);
        when(examenes.perteneceADocente(3, 8)).thenReturn(false);
        assertThat(acceso.puedeExpulsar(3, sesion("ajeno@umss.edu", "DOCENTE"))).isFalse();
        assertThat(acceso.puedeExpulsar(3, sesion("control@umss.edu", "CONTROL"))).isFalse();
        assertThat(acceso.puedeExpulsar(3, sesion("est@umss.edu", "ESTUDIANTE"))).isFalse();
    }

    // El DOCENTE asocia estudiantes y cambia su habilitación en sus propios exámenes, como el ADMIN.
    @Test
    void elAdminYElDocenteDelExamenPuedenAsociarEstudiantes() {
        docente("propio@umss.edu", 7);
        when(examenes.perteneceADocente(3, 7)).thenReturn(true);
        assertThat(acceso.puedeGestionarHabilitacion(3, sesion("admin@umss.edu", "ADMIN"))).isTrue();
        assertThat(acceso.puedeGestionarHabilitacion(3, sesion("propio@umss.edu", "DOCENTE"))).isTrue();
    }

    @Test
    void otroDocenteElControlYElEstudianteNoPuedenAsociarEstudiantes() {
        docente("ajeno@umss.edu", 8);
        when(examenes.perteneceADocente(3, 8)).thenReturn(false);
        assertThat(acceso.puedeGestionarHabilitacion(3, sesion("ajeno@umss.edu", "DOCENTE"))).isFalse();
        assertThat(acceso.puedeGestionarHabilitacion(3, sesion("control@umss.edu", "CONTROL"))).isFalse();
        assertThat(acceso.puedeGestionarHabilitacion(3, sesion("est@umss.edu", "ESTUDIANTE"))).isFalse();
    }

    // El DOCENTE crea y edita sus propios exámenes igual que el ADMIN.
    @Test
    void elAdminYElDocenteDelExamenPuedenEditar() {
        docente("propio@umss.edu", 7);
        when(examenes.perteneceADocente(3, 7)).thenReturn(true);
        assertThat(acceso.puedeEditar(3, sesion("admin@umss.edu", "ADMIN"))).isTrue();
        assertThat(acceso.puedeEditar(3, sesion("propio@umss.edu", "DOCENTE"))).isTrue();
    }

    @Test
    void otroDocenteElControlYElEstudianteNoPuedenEditar() {
        docente("ajeno@umss.edu", 8);
        when(examenes.perteneceADocente(3, 8)).thenReturn(false);
        assertThat(acceso.puedeEditar(3, sesion("ajeno@umss.edu", "DOCENTE"))).isFalse();
        assertThat(acceso.puedeEditar(3, sesion("control@umss.edu", "CONTROL"))).isFalse();
        assertThat(acceso.puedeEditar(3, sesion("est@umss.edu", "ESTUDIANTE"))).isFalse();
    }
}
