package com.nexacore.examenes;

import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.AulaExamenResponse;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.services.ExamenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Editar un examen agregando y quitando aulas, con la base de pruebas real y sin repositorios
 * simulados: los simulados no reproducen la caché de JPA que dejaba el aula en null en la respuesta.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ExamenAulasIntegracionTests {

    private static final int EXAMEN = 9601;
    private static final int PARALELO = 9602;
    private static final int MATERIA = 9603;
    private static final int DOCENTE = 9604;
    private static final int AULA_PRINCIPAL = 9605;
    private static final int AULA_EXTRA = 9606;
    private static final LocalDate FECHA = LocalDate.now().plusDays(10);

    @Autowired ExamenService examenService;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void preparar() {
        jdbc.execute("SET REFERENTIAL_INTEGRITY FALSE");
        jdbc.update("INSERT INTO ambiente (id_ambiente, nombre, ubicacion, capacidad) VALUES (?, '692A', 'FCyT', 40)", AULA_PRINCIPAL);
        jdbc.update("INSERT INTO ambiente (id_ambiente, nombre, ubicacion, capacidad) VALUES (?, '691A', 'FCyT', 30)", AULA_EXTRA);
        jdbc.update("INSERT INTO materia (id_materia, sigla, nombre) VALUES (?, 'CAL-1', 'Calculo Uno')", MATERIA);
        jdbc.update("""
                INSERT INTO usuario (id_usuario, nombre, apellidos, ci, email, password, estado, intentos_fallidos)
                VALUES (?, 'Ana', 'Rojas', '9604000', 'ana.aulas@umss.edu.bo', 'x', 'activo', 0)
                """, DOCENTE);
        jdbc.update("INSERT INTO docente (id_usuario, categoria) VALUES (?, 'INTERINO')", DOCENTE);
        jdbc.update("INSERT INTO paralelo (id_paralelo, id_materia, id_docente, nombre_grupo) VALUES (?, ?, ?, 'G1')",
                PARALELO, MATERIA, DOCENTE);
        jdbc.update("""
                INSERT INTO examen (id_examen, id_paralelo, id_materia, id_docente, fecha, hora_inicio,
                                    duracion_minutos, id_ambiente, estado)
                VALUES (?, ?, ?, ?, ?, '09:00:00', 90, ?, 'programado')
                """, EXAMEN, PARALELO, MATERIA, DOCENTE, FECHA, AULA_PRINCIPAL);
    }

    private ExamenResponse editar(List<Integer> adicionales) {
        return examenService.actualizar(EXAMEN, PARALELO, new ActualizarExamenRequest(
                "Calculo Uno", "Ana Rojas", FECHA, LocalTime.of(9, 0), 90, AULA_PRINCIPAL,
                List.of(), List.of(), MATERIA, DOCENTE, List.of(), List.of(), adicionales));
    }

    @Test
    void editarAgregandoUnaSegundaAulaLaGuardaYLaDevuelve() {
        ExamenResponse r = editar(List.of(AULA_EXTRA));

        assertThat(r.aulas()).extracting(AulaExamenResponse::nombre).containsExactly("692A", "691A");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM examen_aula WHERE id_examen = ?", Integer.class, EXAMEN))
                .isEqualTo(1);
    }

    @Test
    void editarDeNuevoConservaYLuegoQuitaLasAulas() {
        editar(List.of(AULA_EXTRA));
        assertThat(editar(List.of(AULA_EXTRA)).aulas()).hasSize(2);

        assertThat(editar(List.of()).aulas()).extracting(AulaExamenResponse::nombre).containsExactly("692A");
    }
}
