package com.nexacore.examenes;

import com.nexacore.examenes.dto.AmbienteResponse;
import com.nexacore.examenes.exceptions.AmbienteDuplicadoException;
import com.nexacore.examenes.services.AmbienteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AmbienteControllerTests {

    @Autowired MockMvc mockMvc;
    @MockBean AmbienteService ambienteService;

    private void crear(String nombre, org.springframework.test.web.servlet.ResultMatcher esperado) throws Exception {
        mockMvc.perform(post("/ambientes").contentType("application/json")
                        .content("{\"nombre\":\"" + nombre + "\"}"))
                .andExpect(esperado);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCreaAmbienteAlfanumerico() throws Exception {
        when(ambienteService.crear(any())).thenReturn(new AmbienteResponse(1, "LAB3", "FCyT UMSS", null, null));
        crear("LAB3", status().isCreated());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void soloAdminCreaAmbientes() throws Exception {
        crear("LAB3", status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rechazaSimbolosYLongitud() throws Exception {
        crear("LAB-3", status().isBadRequest());
        crear("A", status().isBadRequest());
        crear("A".repeat(21), status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void duplicadoRealRespondeConflicto() throws Exception {
        when(ambienteService.crear(any())).thenThrow(new AmbienteDuplicadoException("LAB3"));
        mockMvc.perform(post("/ambientes").contentType("application/json").content("{\"nombre\":\"LAB3\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").exists());
    }
}
