package com.nexacore.examenes;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class ExpulsionConcurrenciaTests extends ExpulsionPostgresBase {
    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void transaccionAntiguaNoConfundeLaSesion(boolean reprogramacionAntigua) throws Exception {
        var iniciada = new CountDownLatch(1);
        var continuar = new CountDownLatch(1);
        try (var pool = Executors.newSingleThreadExecutor()) {
            var pendiente = pool.submit(() -> tx.execute(status -> {
                jdbc.queryForObject("SELECT NOW()", LocalDateTime.class);
                iniciada.countDown();
                try {
                    esperar(continuar);
                } catch (InterruptedException e) {
                    throw new IllegalStateException(e);
                }
                if (reprogramacionAntigua) reprogramar();
                else control.expulsar(request(), admin(email));
                return null;
            }));
            esperar(iniciada);
            if (reprogramacionAntigua) control.expulsar(request(), admin(email));
            else {
                reprogramar();
                ingresoNuevo();
            }
            continuar.countDown();
            pendiente.get(10, TimeUnit.SECONDS);
            assertEquals(!reprogramacionAntigua, expulsiones.expulsadoEnSesionActual(estudiante, examen, sesiones.ultimoCierre(examen)));
        } finally {
            continuar.countDown();
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void ambasOrdenesDeBloqueoTerminanSinDeadlock(boolean expulsionPrimero) throws Exception {
        var bloqueada = new CountDownLatch(1);
        var continuar = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var primera = pool.submit(() -> tx.execute(status -> {
                aulas.bloquearExamen(examen);
                bloqueada.countDown();
                try {
                    esperar(continuar);
                } catch (InterruptedException e) {
                    throw new IllegalStateException(e);
                }
                if (expulsionPrimero) control.expulsar(request(), admin(email));
                else reprogramar();
                return null;
            }));
            esperar(bloqueada);
            var segunda = pool.submit(() -> {
                if (expulsionPrimero) reprogramar();
                else assertEquals(409, assertThrows(ControlIngresoException.class,
                        () -> control.expulsar(request(), admin(email))).getStatus().value());
            });
            assertTimeoutPreemptively(Duration.ofSeconds(6), () -> {
                while (jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'", Integer.class) == 0) {
                    Thread.sleep(20);
                }
            });
            continuar.countDown();
            primera.get(10, TimeUnit.SECONDS);
            segunda.get(10, TimeUnit.SECONDS);
            assertTrue(expulsiones.deSesionActual(examen, sesiones.ultimoCierre(examen)).isEmpty());
        } finally {
            continuar.countDown();
        }
    }

    @Test
    void dosAdministradoresSoloRegistranUnaExpulsion() throws Exception {
        String otro = "otro" + examen + "@sigex.test";
        jdbc.update("INSERT INTO usuario(nombre,apellidos,ci,email,password,estado) VALUES ('Luis','Prueba',?,?,'x','activo')", "OTR" + examen, otro);
        var inicio = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var tareas = List.of(email, otro).stream().map(nombre -> pool.submit(() -> {
                esperar(inicio);
                try {
                    control.expulsar(request(), admin(nombre));
                    return 1;
                } catch (ControlIngresoException error) {
                    assertEquals(409, error.getStatus().value());
                    return 0;
                }
            })).toList();
            inicio.countDown();
            assertEquals(1, tareas.get(0).get(10, TimeUnit.SECONDS) + tareas.get(1).get(10, TimeUnit.SECONDS));
            assertEquals(1, expulsiones.deSesionActual(examen, null).size());
        }
    }

    @Test
    void repetirSesionesConservaHistorialSinHeredarExpulsiones() {
        for (int numero = 1; numero <= 3; numero++) {
            control.expulsar(request(), admin(email));
            reprogramar();
            assertTrue(expulsiones.deSesionActual(examen, sesiones.ultimoCierre(examen)).isEmpty());
            assertEquals(numero, expulsiones.deSesionActual(examen, null).size());
            jdbc.update("UPDATE examen SET fecha=CURRENT_DATE-1 WHERE id_examen=?", examen);
            ingresoNuevo();
        }
    }

    @Test
    void rollbackNoPersisteNiNotificaYElCommitConservaAuditoria() {
        var emitter = notificaciones.suscribir(admin(email));
        Set<?> enviados = (Set<?>) ReflectionTestUtils.getField(emitter, "earlySendAttempts");
        int antes = enviados.size();
        assertThrows(IllegalStateException.class, () -> tx.executeWithoutResult(status -> {
            control.expulsar(request(), admin(email));
            assertEquals(antes, enviados.size());
            throw new IllegalStateException("Fallo después de persistir");
        }));
        assertTrue(expulsiones.deSesionActual(examen, null).isEmpty());
        assertEquals(antes, enviados.size());
        tx.executeWithoutResult(status -> {
            var registro = control.expulsar(request(), admin(email));
            assertEquals("Ana Prueba", registro.responsable());
            assertEquals("Uso de celular", registro.motivo());
            assertEquals(expulsiones.fechaHoraRegistrada(registro.idExpulsion()), registro.fechaHora());
            assertEquals(antes, enviados.size());
        });
        assertTrue(enviados.size() > antes);
        emitter.complete();
    }
}
