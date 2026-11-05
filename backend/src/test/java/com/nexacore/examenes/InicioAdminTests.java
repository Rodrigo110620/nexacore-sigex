package com.nexacore.examenes;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Panel de inicio del ADMIN: solo quien ve todos los exámenes y los reportes. Los números se prueban en PostgreSQL. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class InicioAdminTests {

    @Autowired MockMvc mockMvc;

    @Test
    void elAdminVeElResumenDelDiaYDeLaSemana() throws Exception {
        mockMvc.perform(get("/inicio/admin").with(user("admin@sigex.test").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hoy.asociados").isNumber())
                .andExpect(jsonPath("$.ingresosPorHora.length()").value(24))
                .andExpect(jsonPath("$.esperadosPorHora.length()").value(24))
                .andExpect(jsonPath("$.dias.length()").value(7))
                .andExpect(jsonPath("$.motivos").isArray())
                .andExpect(jsonPath("$.pendientes.fotos").isNumber());
    }

    @Test
    void elDocenteYElControlNoLoVen() throws Exception {
        for (String rol : new String[]{"DOCENTE", "CONTROL", "ESTUDIANTE"}) {
            mockMvc.perform(get("/inicio/admin").with(user("x@sigex.test").roles(rol))).andExpect(status().isForbidden());
        }
    }
}
