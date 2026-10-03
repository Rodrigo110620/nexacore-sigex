package com.nexacore.examenes;

import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.JwtAuthFilter;
import com.nexacore.examenes.security.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/** El filtro toma estado y roles de la BD, no del token. */
@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTests {

    private static final String EMAIL = "ana@umss.edu.bo";

    @Mock UsuarioRepository usuarioRepository;

    JwtService jwtService;
    JwtAuthFilter filtro;

    @BeforeEach
    void preparar() {
        jwtService = new JwtService("test_secret_key_muy_larga_para_que_pase_la_validacion_de_longitud_minima",
                3_600_000L);
        filtro = new JwtAuthFilter(jwtService, usuarioRepository);
    }

    @AfterEach
    void limpiarSesion() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usaLosRolesActualesDeLaBaseYNoLosDelToken() throws Exception {
        when(usuarioRepository.esActivo(EMAIL)).thenReturn(true);
        when(usuarioRepository.findNombresDeRol(EMAIL)).thenReturn(List.of("DOCENTE"));

        filtrar(jwtService.generarToken(EMAIL, List.of("ADMIN")));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth.getName()).isEqualTo(EMAIL);
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_DOCENTE");
    }

    @Test
    void noAutenticaAUnUsuarioDesactivadoAunqueSuTokenSigaVigente() throws Exception {
        when(usuarioRepository.esActivo(EMAIL)).thenReturn(false);

        filtrar(jwtService.generarToken(EMAIL, List.of("ADMIN")));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void unUsuarioActivoSinRolesQuedaAutenticadoSinPermisos() throws Exception {
        when(usuarioRepository.esActivo(EMAIL)).thenReturn(true);
        when(usuarioRepository.findNombresDeRol(EMAIL)).thenReturn(List.of());

        filtrar(jwtService.generarToken(EMAIL, List.of("ADMIN")));

        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities()).isEmpty();
    }

    private void filtrar(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        filtro.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }
}
