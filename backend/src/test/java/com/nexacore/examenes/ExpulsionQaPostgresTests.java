package com.nexacore.examenes;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import org.junit.jupiter.api.Test;
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
