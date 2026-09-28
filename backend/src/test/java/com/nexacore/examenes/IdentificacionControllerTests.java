package com.nexacore.examenes;

import com.nexacore.examenes.dto.EstudianteAsignadoResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
import com.nexacore.examenes.services.IdentificacionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static com.nexacore.examenes.dto.IdentificacionResponse.Estado.DESHABILITADO;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class IdentificacionControllerTests {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IdentificacionService service;

    @Test
    @WithMockUser(roles = "DOCENTE")
    void rechazaUsuarioSinRolControlOAdmin() throws Exception {
        mockMvc.perform(get("/examenes/7/estudiantes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void listaConElFormatoPaginadoYLosValoresPorDefecto() throws Exception {
        EstudianteAsignadoResponse fila = new EstudianteAsignadoResponse(23, "Zoe", "Quispe Luna", "201901234",
                "7845123", "Ingeniería de Sistemas", DESHABILITADO, "Deuda en biblioteca", true);
        when(service.listarAsignados(7, "TODOS", 0, 10)).thenReturn(new PageResponse<>(List.of(fila), 0, 10, 1, 1));

        mockMvc.perform(get("/examenes/7/estudiantes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[0].estado").value("DESHABILITADO"))
                .andExpect(jsonPath("$.contenido[0].motivoInhabilitacion").value("Deuda en biblioteca"))
                .andExpect(jsonPath("$.contenido[0].ingresado").value(true))
                .andExpect(jsonPath("$.totalRegistros").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resumenNoChocaConElListado() throws Exception {
        when(service.resumir(7)).thenReturn(new ResumenEstudiantesResponse(3, 2, 1, 1));

        mockMvc.perform(get("/examenes/7/estudiantes/resumen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.noHabilitados").value(1));
    }
}
