package com.nexacore.examenes;

import com.nexacore.examenes.services.AuditoriaService;
import com.nexacore.examenes.services.RespaldoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** IMP-10: descarga del respaldo de la base, solo para el ADMIN. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class RespaldoControllerTests {

    @Autowired MockMvc mockMvc;
    @MockitoBean RespaldoService respaldoService;
    @MockitoBean AuditoriaService auditoriaService;

    @Test
    void elAdminDescargaElRespaldoComoArchivo() throws Exception {
        when(respaldoService.nombreArchivo(".sql")).thenReturn("sigex-respaldo-20261031-1500.sql");
        doAnswer(inv -> {
            inv.<OutputStream>getArgument(0).write("-- PostgreSQL database dump".getBytes(StandardCharsets.UTF_8));
            return null;
        }).when(respaldoService).generar(any());

        MvcResult inicio = mockMvc.perform(get("/admin/respaldo").with(user("admin@sigex.test").roles("ADMIN")))
                .andExpect(request().asyncStarted()).andReturn();
        mockMvc.perform(asyncDispatch(inicio))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"sigex-respaldo-20261031-1500.sql\""))
                .andExpect(content().string("-- PostgreSQL database dump"));
        verify(auditoriaService).registrar(anyString(), any());
    }

    @Test
    void docenteYControlNoPuedenDescargarlo() throws Exception {
        for (String rol : new String[] {"DOCENTE", "CONTROL", "ESTUDIANTE"}) {
            mockMvc.perform(get("/admin/respaldo").with(user("otro@sigex.test").roles(rol))).andExpect(status().isForbidden());
        }
        verify(respaldoService, never()).generar(any());
    }

    @Test
    void siPgDumpFallaResponde503ConElMotivo() throws Exception {
        doThrow(new IllegalStateException("No se pudo ejecutar pg_dump.")).when(respaldoService).generar(any());

        mockMvc.perform(get("/admin/respaldo").with(user("admin@sigex.test").roles("ADMIN")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensaje").value(org.hamcrest.Matchers.containsString("No se pudo ejecutar pg_dump.")));
    }
}
