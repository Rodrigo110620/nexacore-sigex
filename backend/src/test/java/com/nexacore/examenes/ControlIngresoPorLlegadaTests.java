package com.nexacore.examenes;

import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.dto.AutorizarIngresoResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.services.ControlIngresoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Reparto por orden de llegada con la base de pruebas real: dos aulas de un lugar cada una.
 * El primero en llegar va a la principal, el segundo a la siguiente y el tercero ya no tiene lugar.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ControlIngresoPorLlegadaTests {

    private static final int EXAMEN = 9701;
    private static final int PARALELO = 9702;
    private static final int MATERIA = 9703;
    private static final int DOCENTE = 9704;
    private static final int CONTROL = 9705;
    private static final int AULA_PRINCIPAL = 9706;
    private static final int AULA_EXTRA = 9707;
    private static final String EMAIL_CONTROL = "control.llegada@umss.edu.bo";

    @Autowired ControlIngresoService controlIngresoService;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void preparar() {
        jdbc.execute("SET REFERENTIAL_INTEGRITY FALSE");
        // En Postgres la crea la migración; H2 arma el esquema desde las entidades y no la tiene.
        jdbc.execute("CREATE SEQUENCE IF NOT EXISTS registro_control_ingreso_id_control_seq");
        jdbc.update("INSERT INTO ambiente (id_ambiente, nombre, ubicacion, capacidad) VALUES (?, '692A', 'FCyT', 1)", AULA_PRINCIPAL);
        jdbc.update("INSERT INTO ambiente (id_ambiente, nombre, ubicacion, capacidad) VALUES (?, '691A', 'FCyT', 1)", AULA_EXTRA);
        jdbc.update("INSERT INTO materia (id_materia, sigla, nombre) VALUES (?, 'CAL-2', 'Calculo Dos')", MATERIA);
        usuario(DOCENTE, "Ana", "9704000", "ana.llegada@umss.edu.bo");
        usuario(CONTROL, "Carla", "9705000", EMAIL_CONTROL);
        jdbc.update("INSERT INTO docente (id_usuario, categoria) VALUES (?, 'INTERINO')", DOCENTE);
        jdbc.update("INSERT INTO paralelo (id_paralelo, id_materia, id_docente, nombre_grupo) VALUES (?, ?, ?, 'G1')",
                PARALELO, MATERIA, DOCENTE);
        jdbc.update("""
                INSERT INTO examen (id_examen, id_paralelo, id_materia, id_docente, fecha, hora_inicio,
                                    duracion_minutos, id_ambiente, estado, modo_reparto)
                VALUES (?, ?, ?, ?, ?, '09:00:00', 90, ?, 'programado', 'LLEGADA')
                """, EXAMEN, PARALELO, MATERIA, DOCENTE, LocalDate.now(), AULA_PRINCIPAL);
        jdbc.update("INSERT INTO examen_aula (id_examen, id_ambiente, orden) VALUES (?, ?, 1)", EXAMEN, AULA_EXTRA);
        for (int i = 1; i <= 3; i++) {
            int id = 9710 + i;
            jdbc.update("""
                    INSERT INTO estudiante (id_estudiante, codigo_sis, ci, nombre, apellidos, email)
                    VALUES (?, ?, ?, ?, 'Llegada', ?)
                    """, id, "20269971" + i, "99710" + i + "0", "Est" + i, "llegada" + i + "@umss.edu");
            jdbc.update("""
                    INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado)
                    VALUES (?, ?, ?, TRUE)
                    """, id, EXAMEN, PARALELO);
        }
    }

    private void usuario(int id, String nombre, String ci, String email) {
        jdbc.update("""
                INSERT INTO usuario (id_usuario, nombre, apellidos, ci, email, password, estado, intentos_fallidos)
                VALUES (?, ?, 'Prueba', ?, ?, 'x', 'activo', 0)
                """, id, nombre, ci, email);
    }

    private AutorizarIngresoResponse llega(int idEstudiante) {
        return controlIngresoService.autorizar(
                new AutorizarIngresoRequest(idEstudiante, EXAMEN, null, true, List.of("CI"), List.of()), EMAIL_CONTROL);
    }

    private Integer aulaDeIngreso(int idEstudiante) {
        return jdbc.queryForObject("SELECT id_ambiente_ingreso FROM asistencia_examen WHERE id_estudiante = ? AND id_examen = ?",
                Integer.class, idEstudiante, EXAMEN);
    }

    @Test
    void llenaLaPrimeraAulaYRecienDespuesUsaLaSiguiente() {
        // Llegan en desorden respecto al alfabeto: manda el orden de llegada.
        AutorizarIngresoResponse primero = llega(9713);
        AutorizarIngresoResponse segundo = llega(9711);

        assertThat(primero.autorizado()).isTrue();
        assertThat(primero.ambiente()).isEqualTo("692A");
        assertThat(aulaDeIngreso(9713)).isEqualTo(AULA_PRINCIPAL);
        assertThat(segundo.ambiente()).isEqualTo("691A");
        assertThat(aulaDeIngreso(9711)).isEqualTo(AULA_EXTRA);

        assertThatThrownBy(() -> llega(9712))
                .isInstanceOf(ControlIngresoException.class)
                .hasMessageContaining("Todas las aulas del examen están llenas");
        assertThat(aulaDeIngreso(9712)).isNull();
    }
}
