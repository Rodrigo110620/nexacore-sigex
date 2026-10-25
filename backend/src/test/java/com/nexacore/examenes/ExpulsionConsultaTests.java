package com.nexacore.examenes;

import com.nexacore.examenes.models.Expulsion;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.ExpulsionConsultaService;
import com.nexacore.examenes.services.SesionExamenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ExpulsionConsultaTests {
    @Autowired MockMvc mvc;
    @Autowired ExpulsionConsultaService service;
    @MockBean ExpulsionRepository expulsiones;
    @MockBean UsuarioRepository usuarios;
    @MockBean ExamenRepository examenes;
    @MockBean SesionExamenService sesiones;
    private final LocalDateTime fecha = LocalDateTime.of(2026, 10, 24, 14, 0);

    @BeforeEach
    void preparar() {
        var responsable = new Usuario();
        responsable.setId(7);
        responsable.setNombre("Ana");
        responsable.setApellidos("Rojas");
        when(usuarios.findAllById(List.of(7))).thenReturn(List.of(responsable));
        when(usuarios.findByEmail("docente@sigex.test")).thenReturn(Optional.of(responsable));
        when(sesiones.ultimoCierre(20)).thenReturn(fecha.minusDays(1));
        when(expulsiones.deSesionActual(20, fecha.minusDays(1))).thenReturn(List.of(registro(90, 10), registro(91, 11)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "CONTROL", "DOCENTE", "ESTUDIANTE"})
    void consultaRespetaRolesYDocenteAsignado(String rol) throws Exception {
        when(examenes.perteneceADocente(20, 7)).thenReturn(true);
        var respuesta = mvc.perform(get("/control-ingresos/examen/20/expulsiones")
                        .with(user("docente@sigex.test").roles(rol)))
                .andExpect(status().is(rol.equals("ESTUDIANTE") ? 403 : 200));
        if (!rol.equals("ESTUDIANTE")) respuesta.andExpect(jsonPath("$[0].responsable").value("Ana Rojas"));
    }

    @Test
    void docenteAjenoNoPuedeConsultar() throws Exception {
        mvc.perform(get("/control-ingresos/examen/20/expulsiones").with(user("docente@sigex.test").roles("DOCENTE")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(expulsiones);
    }

    @Test
    void agrupaResponsablesYRecargaConElCierreActualSinConservarLaSesionAnterior() {
        var registros = service.listar(20);
        assertEquals(2, registros.size());
        assertEquals("Uso de celular", registros.getFirst().motivo());
        assertEquals(fecha, registros.getFirst().fechaHora());
        when(sesiones.ultimoCierre(20)).thenReturn(fecha.plusSeconds(1));
        when(expulsiones.deSesionActual(20, fecha.plusSeconds(1))).thenReturn(List.of());
        assertTrue(service.listar(20).isEmpty());
        verify(usuarios, times(1)).findAllById(List.of(7));
    }

    private Expulsion registro(int id, int estudiante) {
        var registro = new Expulsion();
        registro.setId(id);
        registro.setIdEstudiante(estudiante);
        registro.setIdExamen(20);
        registro.setIdUsuarioResponsable(7);
        registro.setMotivo("Uso de celular");
        registro.setFechaHora(fecha);
        return registro;
    }
}
