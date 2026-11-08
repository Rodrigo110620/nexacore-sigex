package com.nexacore.examenes;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.AsistenciaExamenId;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Expulsion;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.ControlIngresoService;
import com.nexacore.examenes.services.NotificacionService;
import com.nexacore.examenes.services.SesionExamenService;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Comprueba el motivo entregado al repositorio y devuelto al cliente sin conectarse a una BD. */
@ExtendWith(MockitoExtension.class)
class ExpulsionMotivoPersistenciaTests {
    @Mock AsistenciaExamenRepository asistencias;
    @Mock UsuarioRepository usuarios;
    @Mock ExpulsionRepository expulsiones;
    @Mock SesionExamenService sesiones;
    @Mock NotificacionService notificaciones;
    @InjectMocks ControlIngresoService control;

    @ParameterizedTest
    @CsvSource({"USO DE CI EN AULA 690B,Uso de CI en aula 690B",
            "Uso de SIS durante el examen,Uso de SIS durante el examen",
            "uSO de cI y sIs en aula 690B,Uso de CI y SIS en aula 690B",
            "Uso de celular durante el examen,Uso de celular durante el examen"})
    void repositorioYRespuestaRecibenElMismoMotivo(String entrada, String esperado) {
        var admin = new Usuario();
        admin.setId(7);
        admin.setNombre("Ana");
        admin.setApellidos("Rojas");
        when(usuarios.findByEmail("admin@sigex.test")).thenReturn(Optional.of(admin));
        var estudiante = new Estudiante();
        estudiante.setNombre("Eva");
        estudiante.setApellidos("Prueba");
        var id = new AsistenciaExamenId();
        id.setIdEstudiante(10);
        id.setIdExamen(20);
        var asistencia = new AsistenciaExamen();
        asistencia.setId(id);
        asistencia.setEstudiante(estudiante);
        asistencia.setFechaHoraIngreso(LocalDateTime.of(2026, 11, 7, 9, 0));
        when(asistencias.bloquearParaExpulsar(10, 20)).thenReturn(Optional.of(asistencia));
        doAnswer(invocacion -> {
            Expulsion guardada = invocacion.getArgument(0);
            assertEquals(esperado, guardada.getMotivo());
            guardada.setId(90);
            return guardada;
        }).when(expulsiones).saveAndFlush(any(Expulsion.class));
        when(expulsiones.fechaHoraRegistrada(90)).thenReturn(LocalDateTime.of(2026, 11, 7, 9, 1));
        var autenticado = UsernamePasswordAuthenticationToken.authenticated("admin@sigex.test", null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        var respuesta = control.expulsar(new ExpulsarEstudianteRequest(10, 20, entrada), autenticado);

        assertEquals(esperado, respuesta.motivo());
        verify(expulsiones).saveAndFlush(any(Expulsion.class));
    }
}
