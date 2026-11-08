package com.nexacore.examenes;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** API, servicio y consulta reales en H2 aislada; cada prueba revierte sus datos. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(roles = "ADMIN")
class EstudiantesAusentesApiTests {
    private static final int ID = 720001;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void prepararMezclaDeDosExamenes() {
        jdbc.update("INSERT INTO usuario(id_usuario,nombre,apellidos,ci,email,password) VALUES (?,'Ana','Prueba','AUSENTES','ausentes@sigex.test','x')", ID);
        jdbc.update("INSERT INTO docente(id_usuario,categoria) VALUES (?,'INTERINO')", ID);
        jdbc.update("INSERT INTO materia(id_materia,sigla,nombre) VALUES (?,'AUSENTES','Prueba de ausentes')", ID);
        jdbc.update("INSERT INTO paralelo(id_paralelo,id_materia,id_docente,nombre_grupo) VALUES (?,?,?,'1')", ID, ID, ID);
        jdbc.update("INSERT INTO ambiente(id_ambiente,nombre) VALUES (?,'690B')", ID);
        for (int examen : new int[]{ID, ID + 1}) {
            jdbc.update("INSERT INTO examen(id_examen,id_paralelo,id_materia,id_docente,id_ambiente,fecha,hora_inicio,duracion_minutos) VALUES (?,?,?,?,?,CURRENT_DATE,'09:00',60)", examen, ID, ID, ID, ID);
        }
        Boolean[] habilitaciones = {true, true, true, true, false, null, true};
        for (int i = 0; i < habilitaciones.length; i++) {
            jdbc.update("INSERT INTO estudiante(id_estudiante,codigo_sis,nombre,apellidos,ci,email) VALUES (?,?,'Eva',?,?,?)",
                    ID + i, "209" + (ID + i), "Apellido " + i, "AUSENTE" + i, "ausente" + i + "@sigex.test");
            jdbc.update("INSERT INTO asistencia_examen(id_estudiante,id_examen,id_paralelo,habilitado,fecha_hora_ingreso) VALUES (?,?,?,?,?)",
                    ID + i, i == 6 ? ID + 1 : ID, ID, habilitaciones[i],
                    i == 3 ? java.sql.Timestamp.valueOf("2026-11-07 09:00:00") : null);
        }
    }

    @Test
    void filtraAntesDePaginarYCuentaSoloHabilitadosSinIngresoDelExamen() throws Exception {
        consultar("AUSENTES", 0).andExpect(jsonPath("$.totalRegistros").value(3))
                .andExpect(jsonPath("$.totalPaginas").value(2)).andExpect(jsonPath("$.contenido.length()").value(2))
                .andExpect(jsonPath("$.contenido[0].idEstudiante").value(ID))
                .andExpect(jsonPath("$.contenido[1].idEstudiante").value(ID + 1))
                .andExpect(jsonPath("$.contenido[0].estado").value("HABILITADO"))
                .andExpect(jsonPath("$.contenido[0].ingresado").value(false));
        consultar("AUSENTES", 1).andExpect(jsonPath("$.totalRegistros").value(3))
                .andExpect(jsonPath("$.pagina").value(1)).andExpect(jsonPath("$.contenido.length()").value(1))
                .andExpect(jsonPath("$.contenido[0].idEstudiante").value(ID + 2));
    }

    @ParameterizedTest
    @CsvSource({"TODOS,6", "HABILITADOS,4", "NO_HABILITADOS,2", "ausentes,3"})
    void conservaLosFiltrosYNormalizaElParametro(String estado, int total) throws Exception {
        consultar(estado, 0).andExpect(jsonPath("$.totalRegistros").value(total));
    }

    @Test
    void unIngresoReduceElTotalYAlFinalNoQuedanAusentes() throws Exception {
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_ingreso=CURRENT_TIMESTAMP WHERE id_examen=? AND id_estudiante=?", ID, ID);
        consultar("AUSENTES", 0).andExpect(jsonPath("$.totalRegistros").value(2))
                .andExpect(jsonPath("$.totalPaginas").value(1))
                .andExpect(jsonPath("$.contenido[0].idEstudiante").value(ID + 1));
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_ingreso=CURRENT_TIMESTAMP WHERE id_examen=? AND habilitado=TRUE", ID);
        consultar("AUSENTES", 0).andExpect(jsonPath("$.totalRegistros").value(0))
                .andExpect(jsonPath("$.contenido").isEmpty());
        mvc.perform(get("/examenes/{id}/estudiantes/resumen", ID)).andExpect(status().isOk())
                .andExpect(jsonPath("$.habilitados").value(4)).andExpect(jsonPath("$.ingresados").value(4));
    }

    private ResultActions consultar(String estado, int page) throws Exception {
        return mvc.perform(get("/examenes/{id}/estudiantes", ID).param("estado", estado)
                .param("page", String.valueOf(page)).param("size", "2")).andExpect(status().isOk());
    }
}
