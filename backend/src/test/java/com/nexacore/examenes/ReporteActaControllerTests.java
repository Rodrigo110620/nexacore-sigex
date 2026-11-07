package com.nexacore.examenes;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.services.ActaExamenService;
import com.nexacore.examenes.services.ExamenAccesoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas del endpoint GET /reportes/examenes/{id}/acta.pdf (HU#4 / HU#6).
 * Sigue el patrón de ReporteIntentosControllerTests: @SpringBootTest + MockitoBean + MockMvc.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ReporteActaControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActaExamenService actaService;

    @MockitoBean
    private ExamenAccesoService examenAccesoService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDescargaActaConExito() throws Exception {
        when(examenAccesoService.esAdmin(any())).thenReturn(true);
        when(actaService.generarActa(20)).thenReturn("%PDF-1.4 prueba".getBytes());

        mockMvc.perform(get("/reportes/examenes/20/acta.pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void examenNoIniciadoDevuelve409() throws Exception {
        when(examenAccesoService.esAdmin(any())).thenReturn(true);
        when(actaService.generarActa(20))
                .thenThrow(new ControlIngresoException(HttpStatus.CONFLICT,
                        "El examen aún no ha iniciado"));

        mockMvc.perform(get("/reportes/examenes/20/acta.pdf"))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void controlRecibe403AlAccederDirectamente() throws Exception {
        // Solo ADMIN puede descargar el acta: CONTROL recibe 403
        mockMvc.perform(get("/reportes/examenes/20/acta.pdf"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void docenteRecibe403AlAccederDirectamente() throws Exception {
        // HU#6: solo ADMIN puede descargar el acta; DOCENTE recibe 403
        mockMvc.perform(get("/reportes/examenes/20/acta.pdf"))
                .andExpect(status().isForbidden());
    }
}
