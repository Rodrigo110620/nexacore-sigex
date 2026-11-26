package com.nexacore.examenes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.security.AuthRateLimitFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** El límite de intentos no se salta inventando la cabecera X-Forwarded-For (el proxy agrega la IP real al final). */
class AuthRateLimitFilterTests {

    private int estado(AuthRateLimitFilter filtro, String xff) throws Exception {
        var req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        req.setRequestURI("/api/v1/auth/login");
        req.setRemoteAddr("10.0.0.1");
        if (xff != null) req.addHeader("X-Forwarded-For", xff);
        var res = new MockHttpServletResponse();
        filtro.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void cambiarLaPrimeraIpDeLaCabeceraNoSaltaElLimite() throws Exception {
        var filtro = new AuthRateLimitFilter(new ObjectMapper().findAndRegisterModules(), true, 3, 60_000);
        for (int i = 0; i < 3; i++) {
            assertThat(estado(filtro, "1.1.1." + i + ", 200.87.10.5")).isEqualTo(200);
        }
        // Otra «IP» inventada al inicio, la misma IP real al final: sigue bloqueado.
        assertThat(estado(filtro, "9.9.9.9, 200.87.10.5")).isEqualTo(429);
        // Otra IP real: tiene su propio límite.
        assertThat(estado(filtro, "200.87.10.6")).isEqualTo(200);
    }

    @Test
    void sinProxyUsaLaDireccionDeLaConexion() throws Exception {
        var filtro = new AuthRateLimitFilter(new ObjectMapper().findAndRegisterModules(), true, 2, 60_000);
        assertThat(estado(filtro, null)).isEqualTo(200);
        assertThat(estado(filtro, null)).isEqualTo(200);
        assertThat(estado(filtro, null)).isEqualTo(429);
    }
}
