package com.nexacore.examenes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.services.ControlIngresoService;
import com.nexacore.examenes.services.NotificacionService;
import com.nexacore.examenes.services.SesionExamenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** API y persistencia reales en H2 aislada; no usa la base local ni migraciones. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AnulacionExpulsionApiTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired ControlIngresoService control;
    @MockitoBean NotificacionService notificaciones;
    @MockitoBean SesionExamenService sesiones; // El bloqueo PostgreSQL no existe en H2; la escritura JPA sí es real.
    private int expulsion;
    private static final int ID = 710001;
    private static final String EMAIL = "anulacion@sigex.test";

    @BeforeEach
    void prepararExpulsion() {
        jdbc.update("INSERT INTO usuario(id_usuario,nombre,apellidos,ci,email,password) VALUES (?,'Ana','Rojas','ANULACION',?,'x')", ID, EMAIL);
        jdbc.update("INSERT INTO docente(id_usuario,categoria) VALUES (?,'INTERINO')", ID);
        jdbc.update("INSERT INTO materia(id_materia,sigla,nombre) VALUES (?,'ANULACION','Prueba de anulación')", ID);
        jdbc.update("INSERT INTO paralelo(id_paralelo,id_materia,id_docente,nombre_grupo) VALUES (?,?,?,'1')", ID, ID, ID);
        jdbc.update("INSERT INTO ambiente(id_ambiente,nombre) VALUES (?,'690B')", ID);
        jdbc.update("INSERT INTO examen(id_examen,id_paralelo,id_materia,id_docente,id_ambiente,fecha,hora_inicio,duracion_minutos) VALUES (?,?,?,?,?,CURRENT_DATE,'09:00',60)", ID, ID, ID, ID, ID);
        jdbc.update("INSERT INTO estudiante(id_estudiante,codigo_sis,nombre,apellidos,ci,email) VALUES (?,'209971001','Eva','Prueba','ANULACION','eva.anulacion@sigex.test')", ID);
        jdbc.update("INSERT INTO asistencia_examen(id_estudiante,id_examen,id_paralelo,habilitado,fecha_hora_ingreso) VALUES (?,?,?,TRUE,CURRENT_TIMESTAMP)", ID, ID, ID);
        var admin = UsernamePasswordAuthenticationToken.authenticated(EMAIL, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        expulsion = control.expulsar(new ExpulsarEstudianteRequest(ID, ID, "Uso de celular"), admin).idExpulsion();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Error del", ExpulsionValidacionesTests.CIEN + "."})
    void solicitudDirectaInvalidaNoAnulaNiEscribe(String motivo) throws Exception {
        mvc.perform(post("/control-ingresos/examen/{examen}/expulsiones/{expulsion}/anular", ID, expulsion)
                        .with(user(EMAIL).roles("ADMIN")).contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("motivo", motivo))))
                .andExpect(status().isBadRequest());
        assertNull(jdbc.queryForObject("SELECT motivo_anulacion FROM expulsion WHERE id_expulsion=?", String.class, expulsion));
        assertNull(jdbc.queryForObject("SELECT anulada_en FROM expulsion WHERE id_expulsion=?", java.sql.Timestamp.class, expulsion));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Error leve", ExpulsionValidacionesTests.CIEN})
    void solicitudDirectaValidaGuardaElMotivoYConservaLaExpulsion(String motivo) throws Exception {
        var fechaOriginal = jdbc.queryForObject("SELECT fecha_hora FROM expulsion WHERE id_expulsion=?", java.sql.Timestamp.class, expulsion);
        mvc.perform(post("/control-ingresos/examen/{examen}/expulsiones/{expulsion}/anular", ID, expulsion)
                        .with(user(EMAIL).roles("ADMIN")).contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("motivo", motivo))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.motivoAnulacion").value(motivo))
                .andExpect(jsonPath("$.motivo").value("Uso de celular"));
        assertEquals(motivo, jdbc.queryForObject("SELECT motivo_anulacion FROM expulsion WHERE id_expulsion=?", String.class, expulsion));
        assertEquals(fechaOriginal, jdbc.queryForObject("SELECT fecha_hora FROM expulsion WHERE id_expulsion=?", java.sql.Timestamp.class, expulsion));
    }
}
