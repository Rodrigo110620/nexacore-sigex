package com.nexacore.examenes;

import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class EstudianteControllerTests {
    private static final String JSON_VALIDO = """
        {"nombre":"María","apellidos":"González","ci":"74892104","email":"maria@umss.edu",
         "codigoSis":"202404012","idFacultad":1,"idCarrera":10}
        """;

    @Autowired MockMvc mockMvc;
    @MockBean EstudianteService estudianteService;
    @MockBean ImportacionEstudiantesService importacionEstudiantesService;

    @Test
    void exigeAutenticacion() throws Exception {
        mockMvc.perform(post("/estudiantes").contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void rechazaRolDistintoDeAdmin() throws Exception {
        mockMvc.perform(post("/estudiantes").contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminPuedeRegistrar() throws Exception {
        when(estudianteService.registrar(any())).thenReturn(new EstudianteListResponse(
            1, "202404012", "María", "González", "74892104", "maria@umss.edu", List.of()));
        mockMvc.perform(post("/estudiantes").contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rechazaCamposObligatoriosIncompletos() throws Exception {
        mockMvc.perform(post("/estudiantes").contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void aplicaRestriccionesDeNombreCiYCorreoInstitucional() throws Exception {
        String invalido = """
            {"nombre":"A","apellidos":"G7","ci":"12AB","email":"persona@gmail.com",
             "codigoSis":"1234AB","idFacultad":1,"idCarrera":10}
            """;
        mockMvc.perform(post("/estudiantes").contentType("application/json").content(invalido))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errores.nombre").exists())
            .andExpect(jsonPath("$.errores.apellidos").exists())
            .andExpect(jsonPath("$.errores.ci").exists())
            .andExpect(jsonPath("$.errores.email").value("Solo se permiten correos institucionales UMSS"))
            .andExpect(jsonPath("$.errores.codigoSis").exists());
    }
}
