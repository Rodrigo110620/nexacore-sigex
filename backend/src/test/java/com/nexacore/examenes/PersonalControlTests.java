package com.nexacore.examenes;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** V53: quién ve y asigna el personal de control, y los reportes del DOCENTE y el CONTROL (solo sus exámenes). */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class PersonalControlTests {

    @Autowired MockMvc mockMvc;

    @Test
    void elControlNoAsignaPersonalYElEstudianteNoVeReportes() throws Exception {
        mockMvc.perform(put("/examenes/1/personal-control").with(user("c@umss.edu").roles("CONTROL")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"idUsuarios\":[]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/personal-control").with(user("c@umss.edu").roles("CONTROL"))).andExpect(status().isForbidden());
        mockMvc.perform(get("/examenes/mios").with(user("e@est.umss.edu").roles("ESTUDIANTE"))).andExpect(status().isForbidden());
        mockMvc.perform(get("/intentos-ingreso/reporte").with(user("e@est.umss.edu").roles("ESTUDIANTE"))).andExpect(status().isForbidden());
    }

    @Test
    void elDocenteYElControlVenSusReportesPeroNoLosDeUnExamenAjeno() throws Exception {
        for (String rol : new String[]{"DOCENTE", "CONTROL"}) {
            mockMvc.perform(get("/examenes/mios").with(user("x@umss.edu").roles(rol))).andExpect(status().isOk());
            mockMvc.perform(get("/intentos-ingreso/reporte").with(user("x@umss.edu").roles(rol))).andExpect(status().isOk());
            mockMvc.perform(get("/intentos-ingreso/reporte").param("idExamen", "999999").with(user("x@umss.edu").roles(rol)))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(get("/personal-control").with(user("d@umss.edu").roles("DOCENTE"))).andExpect(status().isOk());
    }

    @Test
    void lasFotosReportadasSonDeSusExamenesYSoloSeRevisanLasDeSusExamenes() throws Exception {
        mockMvc.perform(get("/reportes/fotos").with(user("e@est.umss.edu").roles("ESTUDIANTE"))).andExpect(status().isForbidden());
        for (String rol : new String[]{"DOCENTE", "CONTROL"}) {
            mockMvc.perform(get("/reportes/fotos").with(user("x@umss.edu").roles(rol))).andExpect(status().isOk());
            mockMvc.perform(get("/reportes/fotos").param("idExamen", "999999").with(user("x@umss.edu").roles(rol)))
                    .andExpect(status().isForbidden());
            // Sin un reporte abierto de uno de sus exámenes, no resuelve nada (eso queda para el ADMIN).
            mockMvc.perform(post("/estudiantes/999999/foto/reportes/descartar").with(user("x@umss.edu").roles(rol)).with(csrf()))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/estudiantes/999999/foto-solicitud/aprobar").with(user("x@umss.edu").roles(rol)).with(csrf()))
                    .andExpect(status().isForbidden());
        }
    }
}
