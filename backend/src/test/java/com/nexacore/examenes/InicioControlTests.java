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

/** Inicio de CONTROL: quien controla el ingreso ve sus registros; el estudiante no. Los números, en PostgreSQL. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class InicioControlTests {

    @Autowired MockMvc mockMvc;

    @Test
    void quienControlaVeSusRegistrosYElEstudianteNo() throws Exception {
        for (String rol : new String[]{"CONTROL", "DOCENTE", "ADMIN"}) {
            mockMvc.perform(get("/inicio/control").with(user("x@umss.edu").roles(rol)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ingresos").value(0))
                    .andExpect(jsonPath("$.ingresosPorHora.length()").value(24))
                    .andExpect(jsonPath("$.recientes").isArray());
        }
        mockMvc.perform(get("/inicio/control").with(user("e@est.umss.edu").roles("ESTUDIANTE"))).andExpect(status().isForbidden());
    }
}
