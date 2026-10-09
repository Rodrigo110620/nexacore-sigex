package com.nexacore.examenes;

import com.nexacore.examenes.services.IntentoIngresoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** End-to-end persistence/query check against the isolated in-memory H2 test database. */
@DataJpaTest
@AutoConfigureTestDatabase
@ActiveProfiles("test")
@Import(IntentoIngresoService.class)
class IntentoIngresoRepositoryIntegrationTests {

    private static final int EXAMEN = 980201;
    private static final int PARALELO = 980202;
    private static final int MATERIA = 980203;
    private static final int DOCENTE = 980204;
    private static final int AMBIENTE = 980205;
    private static final int CONTROL = 980206;
    private static final int ESTUDIANTE_1 = 980207;
    private static final int ESTUDIANTE_2 = 980208;

    @Autowired JdbcTemplate jdbc;
    @Autowired IntentoIngresoService service;

    @Test
    void recuperaTodosLosIntentosPersistidosEnOrdenYConSusAsociaciones() {
        prepararReferencias();
        LocalDateTime primero = LocalDateTime.parse("2026-10-08T10:00:00");
        LocalDateTime segundo = LocalDateTime.parse("2026-10-08T10:05:00");
        LocalDateTime tercero = LocalDateTime.parse("2026-10-08T10:10:00");
        insertarIntento(1, ESTUDIANTE_1, "202600101", "Intento sin registro", primero);
        insertarIntento(2, ESTUDIANTE_2, "74839202", "Examen no correspondiente", tercero);
        insertarIntento(3, ESTUDIANTE_1, "202600101", "Segundo intento", segundo);

        var historial = service.listar(EXAMEN, null);

        assertThat(historial).hasSize(3);
        assertThat(historial).extracting(item -> item.idIntento()).containsExactly(2, 3, 1);
        assertThat(historial).extracting(item -> item.idExamen()).containsOnly(EXAMEN);
        assertThat(historial).extracting(item -> item.estudiante())
                .containsExactly("Luis Flores", "Ana Pérez", "Ana Pérez");
        assertThat(historial).extracting(item -> item.codigoSis())
                .containsExactly("202600202", "202600101", "202600101");
        assertThat(historial).extracting(item -> item.identificador())
                .containsExactly("74839202", "202600101", "202600101");
        assertThat(historial).extracting(item -> item.motivo())
                .containsExactly("Examen no correspondiente", "Segundo intento", "Intento sin registro");
        assertThat(historial).extracting(item -> item.personalControl())
                .containsOnly("Carla Control");
        assertThat(historial).extracting(item -> item.fechaHora())
                .containsExactly(tercero, segundo, primero);
    }

    private void prepararReferencias() {
        jdbc.update("INSERT INTO materia (id_materia, sigla, nombre) VALUES (?, ?, ?)",
                MATERIA, "INT-TST", "Materia de integración");
        jdbc.update("INSERT INTO usuario (id_usuario, nombre, apellidos, ci, email, password, estado, intentos_fallidos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                DOCENTE, "Diego", "Docente", "TST-DOC-980204", "docente-980204@test.invalid", "hash", "activo", 0);
        jdbc.update("INSERT INTO usuario (id_usuario, nombre, apellidos, ci, email, password, estado, intentos_fallidos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                CONTROL, "Carla", "Control", "TST-CTL-980206", "control-980206@test.invalid", "hash", "activo", 0);
        jdbc.update("INSERT INTO docente (id_usuario, categoria) VALUES (?, ?)", DOCENTE, "INTERINO");
        jdbc.update("INSERT INTO ambiente (id_ambiente, nombre) VALUES (?, ?)", AMBIENTE, "Aula de integración");
        jdbc.update("INSERT INTO paralelo (id_paralelo, id_materia, id_docente, nombre_grupo) VALUES (?, ?, ?, ?)",
                PARALELO, MATERIA, DOCENTE, "1");
        jdbc.update("INSERT INTO examen (id_examen, id_paralelo, id_materia, id_docente, fecha, hora_inicio, duracion_minutos, id_ambiente, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                EXAMEN, PARALELO, MATERIA, DOCENTE, java.sql.Date.valueOf("2026-10-08"),
                java.sql.Time.valueOf("09:00:00"), 90, AMBIENTE, "programado");
        insertarEstudiante(ESTUDIANTE_1, "202600101", "Ana", "Pérez", "TST-EST-980207", "ana-980207@test.invalid");
        insertarEstudiante(ESTUDIANTE_2, "202600202", "Luis", "Flores", "TST-EST-980208", "luis-980208@test.invalid");
    }

    private void insertarEstudiante(int id, String codigo, String nombre, String apellidos, String ci, String email) {
        jdbc.update("INSERT INTO estudiante (id_estudiante, codigo_sis, nombre, apellidos, ci, email) VALUES (?, ?, ?, ?, ?, ?)",
                id, codigo, nombre, apellidos, ci, email);
    }

    private void insertarIntento(int id, int estudiante, String identificador, String motivo, LocalDateTime fecha) {
        jdbc.update("INSERT INTO intento_ingreso (id_intento, id_examen, id_paralelo, id_usuario_control, ci_o_codigo, id_estudiante, fecha_hora, observacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, EXAMEN, PARALELO, CONTROL, identificador, estudiante, Timestamp.valueOf(fecha), motivo);
    }
}
