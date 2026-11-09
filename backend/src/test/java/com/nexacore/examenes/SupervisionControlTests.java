package com.nexacore.examenes;

import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
import com.nexacore.examenes.services.ControlIngresoService;
import com.nexacore.examenes.services.IdentificacionService;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El ADMIN supervisa el control de ingreso (ve el panel) pero no lo registra: eso es del CONTROL. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class SupervisionControlTests {

    @Autowired MockMvc mockMvc;
    @MockitoBean IdentificacionService identificacionService;
    @MockitoBean ControlIngresoService controlIngresoService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void elAdminVeElPanelDelExamen() throws Exception {
        when(identificacionService.resumir(7)).thenReturn(new ResumenEstudiantesResponse(10, 8, 2, 5));
        mockMvc.perform(get("/examenes/7/estudiantes/resumen")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void elAdminNoAutorizaIngresos() throws Exception {
        mockMvc.perform(post("/control-ingresos/autorizar").contentType("application/json")
                .content("{\"idEstudiante\":1,\"idExamen\":7}"))
            .andExpect(status().isForbidden());
        verify(controlIngresoService, never()).autorizar(any(), any());
    }
}
