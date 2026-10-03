package com.nexacore.examenes;

import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.services.ControlIngresoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.http.MediaType.APPLICATION_JSON;

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
    void permiteDocenteConsultarTiposDeIncidencia() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void permiteUsuarioConRolControl() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void permiteUsuarioConRolAdmin() throws Exception {
        when(service.listarTiposIncidencia()).thenReturn(List.of());
        mockMvc.perform(get("/control-ingresos/tipos-incidencia"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "control@umss.edu.bo", roles = "CONTROL")
    void respondeConflictAlDenegarUnIngresoYaAutorizado() throws Exception {
        when(service.denegar(any(AutorizarIngresoRequest.class), anyString()))
                .thenThrow(new ControlIngresoException(
                        HttpStatus.CONFLICT, "No se puede denegar un ingreso que ya fue autorizado"));

        mockMvc.perform(post("/control-ingresos/denegar")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"idEstudiante":10,"idExamen":20,"observaciones":"Documento inválido",
                                 "identidadVerificada":false,"verificacionesAdicionales":[],"incidencias":[]}
                                """))
                .andExpect(status().isConflict());
    }
}
