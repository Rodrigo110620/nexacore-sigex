package com.nexacore.examenes;

import com.nexacore.examenes.exceptions.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Una pestaña cerrada con las notificaciones en vivo abiertas no es un error; en otras rutas sí. */
class ConexionEnVivoCerradaTests {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void laConexionEnVivoCerradaSeIgnoraEnSilencio() {
        for (String ruta : new String[]{"/api/v1/notificaciones/stream", "/api/v1/mi/eventos"}) {
            assertThatCode(() -> handler.manejarConexionCerrada(new IOException("Broken pipe"), request(ruta)))
                    .doesNotThrowAnyException();
        }
    }

    @Test
    void enOtrasRutasElErrorSeSiguePropagando() {
        IOException error = new IOException("Disco lleno");
        assertThatThrownBy(() -> handler.manejarConexionCerrada(error, request("/api/v1/estudiantes/1/foto")))
                .isSameAs(error);
    }

    private static MockHttpServletRequest request(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI(uri);
        return request;
    }
}
