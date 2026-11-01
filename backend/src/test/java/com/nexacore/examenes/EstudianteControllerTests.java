package com.nexacore.examenes;

import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    @MockitoBean EstudianteService estudianteService;
    @MockitoBean ImportacionEstudiantesService importacionEstudiantesService;

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
            1, "202404012", "María", "González", "74892104", null, "maria@umss.edu", List.of(), null, null, null, false));    
        mockMvc.perform(post("/estudiantes").contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isCreated());
    }

    // Desde la V49 el registro de estudiantes es del ADMIN: el docente ve a los suyos, pero no los edita.
    @Test
    @WithMockUser(roles = "DOCENTE")
    void docenteNoPuedeRegistrarNiEditar() throws Exception {
        mockMvc.perform(post("/estudiantes").contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isForbidden());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/estudiantes/1")
                .contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isForbidden());
        // Regenerar el QR sí, pero solo de sus estudiantes: este no lo es.
        mockMvc.perform(post("/estudiantes/1/qr/regenerar")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void controlNoRegeneraElQr() throws Exception {
        mockMvc.perform(post("/estudiantes/1/qr/regenerar")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void docentePuedeListarCarreras() throws Exception {
        when(estudianteService.listarCarreras(1)).thenReturn(List.of());
        mockMvc.perform(get("/estudiantes/carreras").param("idFacultad", "1"))
            .andExpect(status().isOk());
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
            .andExpect(jsonPath("$.errores.email").value("Use un correo institucional UMSS con al menos 3 caracteres antes de @; no se aceptan caracteres repetidos"))
            .andExpect(jsonPath("$.errores.codigoSis").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void unaReglaDeLaEntidadRespondeBadRequestYNoError500() throws Exception {
        var estudiante = new com.nexacore.examenes.models.Estudiante();
        estudiante.setTelefono("51234567");
        var violaciones = jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator()
            .validateProperty(estudiante, "telefono");
        when(estudianteService.registrar(any())).thenThrow(new jakarta.validation.ConstraintViolationException(violaciones));

        mockMvc.perform(post("/estudiantes").contentType("application/json").content(JSON_VALIDO))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errores.telefono").exists());
    }
}
