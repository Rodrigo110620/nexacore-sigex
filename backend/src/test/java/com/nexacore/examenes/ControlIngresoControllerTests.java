package com.nexacore.examenes;

import com.nexacore.examenes.services.ControlIngresoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ControlIngresoControllerTests {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ControlIngresoService service;

    @Test
    @WithMockUser(roles = "DOCENTE")
    void rechazaUsuarioSinRolControl() throws Exception {
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void permiteUsuarioConRolControl() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }
}
