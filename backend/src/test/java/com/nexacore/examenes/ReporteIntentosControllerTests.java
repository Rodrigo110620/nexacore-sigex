package com.nexacore.examenes;

import com.nexacore.examenes.dto.IntentoReporteResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.services.IntentoIngresoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** DASH-06 / HU#7: el reporte de intentos incorrectos es solo para el ADMIN. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ReporteIntentosControllerTests {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IntentoIngresoService service;

    @Test
    @WithMockUser(roles = "ADMIN")
    void elAdminVeElReporteFiltradoPorExamen() throws Exception {
        var fila = new IntentoReporteResponse(1, 20, "Física I", LocalDate.parse("2026-10-31"), LocalTime.parse("08:30"),
                10, "Zoe Quispe Luna", "201901234", "201901234", "No inscrito en la materia",
                IntentoReporteResponse.NO_CORRESPONDE, "Luis Paz", LocalDateTime.parse("2026-10-31T08:47:10"));
        when(service.reporte(20, 0, 20)).thenReturn(new PageResponse<>(List.of(fila), 0, 20, 1, 1));
        mockMvc.perform(get("/intentos-ingreso/reporte").param("idExamen", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].examen").value("Física I"))
                .andExpect(jsonPath("$.contenido[0].tipo").value("NO_CORRESPONDE"))
                .andExpect(jsonPath("$.contenido[0].personalControl").value("Luis Paz"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONTROL", "DOCENTE", "ESTUDIANTE"})
    void otrosRolesReciben403(String rol) throws Exception {
        mockMvc.perform(get("/intentos-ingreso/reporte").with(user("x@sigex.test").roles(rol)))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
