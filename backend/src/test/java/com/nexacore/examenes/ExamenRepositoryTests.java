package com.nexacore.examenes;

import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.repositories.ExamenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Consultas de conflicto de horario contra la base (H2). Las FKs se desactivan para no armar
 * materia, docente, paralelo y ambiente.
 */
@SpringBootTest
@ActiveProfiles("test")
class ExamenRepositoryTests {

    private static final LocalDate FECHA = LocalDate.of(2030, 5, 20);

    @Autowired ExamenRepository examenRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @BeforeEach
    void preparar() {
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
        jdbcTemplate.execute("DELETE FROM examen");
        insertarExamen(1, 3, 20, "programado");
        insertarExamen(2, 3, 20, "cancelado");
        insertarExamen(3, 4, 21, null);
    }

    @Test
    void losExamenesCanceladosNoOcupanElAmbiente() {
        assertThat(examenRepository.findByAmbienteAndFecha(3, FECHA))
                .extracting(e -> e.getId().getIdExamen())
                .containsExactly(1);
        // Sin estado se considera programado.
        assertThat(examenRepository.findByAmbienteAndFecha(4, FECHA)).hasSize(1);
    }

    @Test
    void buscaLosExamenesVigentesDelDocenteEnLaFecha() {
        assertThat(examenRepository.findByDocenteAndFecha(20, FECHA))
                .extracting(e -> e.getId().getIdExamen())
                .containsExactly(1);
        assertThat(examenRepository.findByDocenteAndFecha(20, FECHA.plusDays(1))).isEmpty();
        assertThat(examenRepository.findByDocenteAndFecha(21, FECHA))
                .extracting(Examen::getIdAmbiente)
                .containsExactly(4);
    }

    private void insertarExamen(int idExamen, int idAmbiente, int idDocente, String estado) {
        jdbcTemplate.update("""
                INSERT INTO examen (id_examen, id_paralelo, id_materia, id_docente, fecha, hora_inicio,
                                    duracion_minutos, id_ambiente, estado)
                VALUES (?, 2, 8, ?, ?, TIME '09:00:00', 90, ?, ?)
                """, idExamen, idDocente, FECHA, idAmbiente, estado);
    }
}
