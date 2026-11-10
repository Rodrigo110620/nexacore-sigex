package com.nexacore.examenes;

import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.ExamenAccesoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/** Cancelar un examen: el ADMIN cualquiera; el DOCENTE solo los suyos; el CONTROL ninguno. */
@SpringBootTest
@ActiveProfiles("test")
class ExamenAccesoCancelarTests {

    @Autowired ExamenAccesoService acceso;
    @MockitoBean UsuarioRepository usuarioRepository;
    @MockitoBean ExamenRepository examenRepository;

    private static UsernamePasswordAuthenticationToken como(String email, String rol) {
        return new UsernamePasswordAuthenticationToken(email, null, List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
    }

    @Test
    void cadaRolCancelaLoQueLeCorresponde() {
        Usuario docente = new Usuario();
        docente.setId(11);
        when(usuarioRepository.findByEmail("docente@umss.edu")).thenReturn(Optional.of(docente));
        when(examenRepository.perteneceADocente(7, 11)).thenReturn(true);
        when(examenRepository.perteneceADocente(8, 11)).thenReturn(false);

        assertThat(acceso.puedeCancelar(8, como("admin@umss.edu", "ADMIN"))).isTrue();
        assertThat(acceso.puedeCancelar(7, como("docente@umss.edu", "DOCENTE"))).isTrue();
        assertThat(acceso.puedeCancelar(8, como("docente@umss.edu", "DOCENTE"))).isFalse();
        assertThat(acceso.puedeCancelar(7, como("control@umss.edu", "CONTROL"))).isFalse();
    }
}
