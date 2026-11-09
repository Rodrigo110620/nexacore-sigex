package com.nexacore.examenes;

import com.nexacore.examenes.services.ExamenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Solo el DOCENTE registra sus propios exámenes; el ADMIN supervisa, edita, reprograma y cancela, pero no crea. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class RegistroExamenPermisoTests {

    private static final String EXAMEN = """
        {"asignatura":"Base de Datos I","docente":"Juan Pérez","fecha":"2026-12-01","horaInicio":"09:00",
         "duracionMinutos":90,"idAmbiente":1,"idMateria":1}
        """;

    @Autowired MockMvc mockMvc;
    @MockitoBean ExamenService examenService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void elAdminNoRegistraExamenes() throws Exception {
        mockMvc.perform(post("/examenes").contentType("application/json").content(EXAMEN))
            .andExpect(status().isForbidden());
        verify(examenService, never()).crear(any());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void elControlNoRegistraExamenes() throws Exception {
        mockMvc.perform(post("/examenes").contentType("application/json").content(EXAMEN))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void elDocenteRegistraSusExamenes() throws Exception {
        mockMvc.perform(post("/examenes").contentType("application/json").content(EXAMEN))
            .andExpect(status().isCreated());
        verify(examenService).crear(any());
    }
}
