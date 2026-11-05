package com.nexacore.examenes;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** IMP-12: solo el ADMIN asigna materias; el docente consulta las suyas. La lógica se prueba en PostgreSQL. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class DocenteMateriasPermisosTests {

    @Autowired MockMvc mockMvc;

    @Test
    void soloElAdminVeYCambiaLasMateriasDeUnDocente() throws Exception {
        for (String rol : new String[]{"DOCENTE", "CONTROL"}) {
            mockMvc.perform(get("/usuarios/1/materias").with(user("x@umss.edu").roles(rol))).andExpect(status().isForbidden());
            mockMvc.perform(put("/usuarios/1/materias").with(user("x@umss.edu").roles(rol))
                    .contentType("application/json").content("{\"idMaterias\":[1]}")).andExpect(status().isForbidden());
        }
        // Un usuario que no es docente: 400 con el motivo.
        mockMvc.perform(put("/usuarios/999999/materias").with(user("admin@umss.edu").roles("ADMIN"))
                        .contentType("application/json").content("{\"idMaterias\":[1]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El usuario no está registrado como DOCENTE."));
    }

    @Test
    void elDocenteConsultaSusMateriasYElControlNo() throws Exception {
        mockMvc.perform(get("/materias/mias").with(user("sin.cuenta@umss.edu").roles("DOCENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/materias/mias").with(user("x@umss.edu").roles("CONTROL"))).andExpect(status().isForbidden());
    }
}
