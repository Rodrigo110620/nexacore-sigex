package com.nexacore.examenes;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import java.util.stream.Stream;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class ExpulsionQaPostgresTests extends ExpulsionPostgresBase {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    static Stream<Arguments> motivosValidos() {
        String limite = "Uso de celular durante el examen para copiar respuestas de física";
        return Stream.of(Arguments.of("Uso   de celular", "Uso de celular"),
                Arguments.of("Uso de WhatsApp durante el examen", "Uso de whatsapp durante el examen"),
                Arguments.of("Consulta de archivo PDF", "Consulta de archivo pdf"),
                Arguments.of("Uso de ChatGPT durante el examen", "Uso de chatgpt durante el examen"),
                Arguments.of("Uso de código en C durante el examen", "Uso de código en c durante el examen"),
                Arguments.of(limite.replace(" ", "   "), limite));
    }

    @ParameterizedTest
    @MethodSource("motivosValidos")
    void postPersisteYConsultaElMotivoCanonico(String original, String esperado) throws Exception {
        var response = mvc.perform(post("/control-ingresos/expulsar").with(user(email).roles("ADMIN"))
                        .contentType("application/json").content(mapper.writeValueAsString(
                                java.util.Map.of("idEstudiante", estudiante, "idExamen", examen, "motivo", original))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.motivo").value(esperado)).andReturn();
        int id = mapper.readTree(response.getResponse().getContentAsString()).get("idExpulsion").asInt();
        assertEquals(esperado, jdbc.queryForObject("SELECT motivo FROM expulsion WHERE id_expulsion=?", String.class, id));
        var fecha = expulsiones.fechaHoraRegistrada(id);
        mvc.perform(get("/control-ingresos/examen/{id}/expulsiones", examen).with(user(email).roles("ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].motivo").value(esperado))
                .andExpect(jsonPath("$[0].estudiante").value("Eva Prueba"));
        assertEquals(fecha, expulsiones.fechaHoraRegistrada(id));
    }

    @Test
    void unMotivoCortoNoPersisteLaExpulsion() throws Exception {
        mvc.perform(post("/control-ingresos/expulsar").with(user(email).roles("ADMIN"))
                        .contentType("application/json").content("{\"idEstudiante\":" + estudiante
                                + ",\"idExamen\":" + examen + ",\"motivo\":\"Copia ora\"}"))
                .andExpect(status().isBadRequest());
        assertEquals(0, expulsiones.deSesionActual(examen, null).size());
    }

    @Test
    void consultaRealIncluyeIdentidadSinHistorialManualYConservaAuditoria() throws Exception {
        var respuesta = control.expulsar(new ExpulsarEstudianteRequest(estudiante, examen, "USO de CELULAR"), admin(email));
        assertEquals("Uso de celular", respuesta.motivo());
        assertEquals("Uso de celular", jdbc.queryForObject(
                "SELECT motivo FROM expulsion WHERE id_expulsion=?", String.class, respuesta.idExpulsion()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM registro_control_ingreso WHERE id_examen=?",
                Integer.class, examen));
        mvc.perform(get("/control-ingresos/examen/{id}/expulsiones", examen).with(user(email).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].estudiante").value("Eva Prueba"))
                .andExpect(jsonPath("$[0].codigoSis").value(jdbc.queryForObject(
                        "SELECT codigo_sis FROM estudiante WHERE id_estudiante=?", String.class, estudiante)))
                .andExpect(jsonPath("$[0].responsable").value("Ana Prueba"))
                .andExpect(jsonPath("$[0].motivo").value("Uso de celular"));
        assertEquals(respuesta.fechaHora(), expulsiones.fechaHoraRegistrada(respuesta.idExpulsion()));
        // Los motivos históricos se leen tal como fueron guardados: no se reescriben al consultar.
        jdbc.update("UPDATE expulsion SET motivo='MOTIVO HISTORICO' WHERE id_expulsion=?", respuesta.idExpulsion());
        mvc.perform(get("/control-ingresos/examen/{id}/expulsiones", examen).with(user(email).roles("ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].motivo").value("MOTIVO HISTORICO"));
        assertEquals(respuesta.fechaHora(), expulsiones.fechaHoraRegistrada(respuesta.idExpulsion()));
    }
}
