package com.nexacore.examenes;

import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.AulaExamenResponse;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.dto.AmbienteDisponibilidadResponse;
import com.nexacore.examenes.exceptions.ConflictoExamenException;
import com.nexacore.examenes.services.AmbienteService;
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
    @Autowired AmbienteService ambienteService;
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
        return editar(adicionales, null);
    }

    private ExamenResponse editar(List<Integer> adicionales, String modo) {
        return examenService.actualizar(EXAMEN, PARALELO, new ActualizarExamenRequest(
                "Calculo Uno", "Ana Rojas", FECHA, LocalTime.of(9, 0), 90, AULA_PRINCIPAL,
                List.of(), List.of(), MATERIA, DOCENTE, List.of(), List.of(), adicionales, modo));
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

    @Test
    void elModoDeRepartoSeGuardaYSeConservaSiNoSeEnvia() {
        assertThat(editar(List.of(AULA_EXTRA)).modoReparto()).isEqualTo("ALFABETICO");
        assertThat(editar(List.of(AULA_EXTRA), "llegada").modoReparto()).isEqualTo("LLEGADA");
        assertThat(editar(List.of(AULA_EXTRA), null).modoReparto()).isEqualTo("LLEGADA");
    }

    @Test
    void rechazaUnModoDeRepartoDesconocido() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> editar(List.of(AULA_EXTRA), "AL_AZAR"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("orden alfabético o por orden de llegada");
    }

    // ---- Otro docente, mismo horario: el aula está ocupada aunque sea la segunda aula del otro examen ----

    private static final int OTRO_EXAMEN = 9611;
    private static final int OTRO_PARALELO = 9612;
    private static final int OTRA_MATERIA = 9613;
    private static final int OTRO_DOCENTE = 9614;
    private static final int OTRA_AULA = 9615;

    /** Examen de otro docente a las 14:00 en otra aula; se lo intenta mover a las 9:00. */
    private void prepararOtroDocente() {
        jdbc.update("INSERT INTO ambiente (id_ambiente, nombre, ubicacion, capacidad) VALUES (?, '690B', 'FCyT', 25)", OTRA_AULA);
        jdbc.update("INSERT INTO materia (id_materia, sigla, nombre) VALUES (?, 'FIS-1', 'Fisica Uno')", OTRA_MATERIA);
        jdbc.update("""
                INSERT INTO usuario (id_usuario, nombre, apellidos, ci, email, password, estado, intentos_fallidos)
                VALUES (?, 'Luis', 'Paz', '9614000', 'luis.aulas@umss.edu.bo', 'x', 'activo', 0)
                """, OTRO_DOCENTE);
        jdbc.update("INSERT INTO docente (id_usuario, categoria) VALUES (?, 'INTERINO')", OTRO_DOCENTE);
        jdbc.update("INSERT INTO paralelo (id_paralelo, id_materia, id_docente, nombre_grupo) VALUES (?, ?, ?, 'G1')",
                OTRO_PARALELO, OTRA_MATERIA, OTRO_DOCENTE);
        jdbc.update("""
                INSERT INTO examen (id_examen, id_paralelo, id_materia, id_docente, fecha, hora_inicio,
                                    duracion_minutos, id_ambiente, estado)
                VALUES (?, ?, ?, ?, ?, '14:00:00', 90, ?, 'programado')
                """, OTRO_EXAMEN, OTRO_PARALELO, OTRA_MATERIA, OTRO_DOCENTE, FECHA, OTRA_AULA);
    }

    private ExamenResponse moverOtroExamenALas9(int principal, List<Integer> adicionales) {
        return examenService.actualizar(OTRO_EXAMEN, OTRO_PARALELO, new ActualizarExamenRequest(
                "Fisica Uno", "Luis Paz", FECHA, LocalTime.of(9, 0), 90, principal,
                List.of(), List.of(), OTRA_MATERIA, OTRO_DOCENTE, List.of(), List.of(), adicionales, null));
    }

    @Test
    void otroDocenteNoPuedeUsarComoPrincipalLaSegundaAulaDeOtroExamen() {
        editar(List.of(AULA_EXTRA)); // el primer examen usa 692A + 691A de 9:00 a 10:30
        prepararOtroDocente();

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> moverOtroExamenALas9(AULA_EXTRA, List.of()))
                .isInstanceOf(ConflictoExamenException.class)
                .hasMessageContaining("El ambiente 691A ya tiene un examen");
    }

    @Test
    void otroDocenteNoPuedeAgregarComoSegundaAulaUnAulaOcupada() {
        editar(List.of(AULA_EXTRA));
        prepararOtroDocente();

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> moverOtroExamenALas9(OTRA_AULA, List.of(AULA_PRINCIPAL)))
                .isInstanceOf(ConflictoExamenException.class)
                .hasMessageContaining("El ambiente 692A ya tiene un examen");
    }

    @Test
    void laDisponibilidadMarcaOcupadasLaPrincipalYLaSegundaAula() {
        editar(List.of(AULA_EXTRA));

        List<AmbienteDisponibilidadResponse> lista = ambienteService.disponibilidad(FECHA, LocalTime.of(9, 30), 60, null, null);

        assertThat(lista).filteredOn(a -> a.id() == AULA_PRINCIPAL).singleElement()
                .satisfies(a -> assertThat(a.disponible()).isFalse());
        assertThat(lista).filteredOn(a -> a.id() == AULA_EXTRA).singleElement()
                .satisfies(a -> assertThat(a.disponible()).isFalse());
        // En otro horario quedan libres.
        assertThat(ambienteService.disponibilidad(FECHA, LocalTime.of(14, 0), 60, null, null))
                .filteredOn(a -> a.id() == AULA_EXTRA).singleElement()
                .satisfies(a -> assertThat(a.disponible()).isTrue());
    }

    @Test
    void alEditarLasAulasDelPropioExamenNoSeVenOcupadasPeroLasDeOtroSi() {
        editar(List.of(AULA_EXTRA));
        prepararOtroDocente();
        moverOtroExamenALas9(OTRA_AULA, List.of()); // el otro examen ocupa 690B a las 9:00

        List<AmbienteDisponibilidadResponse> lista =
                ambienteService.disponibilidad(FECHA, LocalTime.of(9, 0), 90, EXAMEN, PARALELO);

        assertThat(lista).filteredOn(a -> a.id() == AULA_PRINCIPAL || a.id() == AULA_EXTRA)
                .allSatisfy(a -> assertThat(a.disponible()).isTrue());
        assertThat(lista).filteredOn(a -> a.id() == OTRA_AULA).singleElement()
                .satisfies(a -> assertThat(a.disponible()).isFalse());
    }
}
