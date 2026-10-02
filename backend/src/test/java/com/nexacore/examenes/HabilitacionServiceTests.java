package com.nexacore.examenes;

import com.nexacore.examenes.dto.ActualizarHabilitacionRequest;
import com.nexacore.examenes.dto.AsociacionLoteResponse;
import com.nexacore.examenes.dto.EstudianteHabilitacionResponse;
import com.nexacore.examenes.dto.EstudianteHabilitacionResponse.EstadoHabilitacion;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.services.HabilitacionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Asociación y habilitación de estudiantes en el examen contra la base (H2). El examen se simula
 * (paralelo 2, materia 8, docente 20) y las FKs se desactivan para no armar docente,
 * materia, paralelo y ambiente.
 */
@SpringBootTest
@ActiveProfiles("test")
class HabilitacionServiceTests {

    private static final int EXAMEN = 2;
    private static final int PARALELO = 2;
    private static final int MATERIA = 8;
    private static final int DOCENTE = 20;
    private static final AtomicInteger SECUENCIA = new AtomicInteger();

    @Autowired HabilitacionService habilitacionService;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired JdbcTemplate jdbcTemplate;
    @MockBean ExamenRepository examenRepository;

    @BeforeEach
    void preparar() {
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
        jdbcTemplate.execute("DELETE FROM asistencia_examen");
        jdbcTemplate.execute("DELETE FROM inscripcion_paralelo");
        ExamenId id = new ExamenId();
        id.setIdExamen(EXAMEN);
        id.setIdParalelo(PARALELO);
        Examen examen = new Examen();
        examen.setId(id);
        examen.setIdMateria(MATERIA);
        examen.setIdDocente(DOCENTE);
        when(examenRepository.findById(any())).thenReturn(Optional.of(examen));
    }

    @Test
    void asociarPorCodigoSisLoDejaPendienteYLoInscribeEnElParalelo() {
        Estudiante ana = estudiante("Ana");

        List<EstudianteHabilitacionResponse> lista = habilitacionService.asociar(EXAMEN, PARALELO, ana.getCodigoSis());

        assertThat(lista).singleElement().satisfies(e -> {
            assertThat(e.idEstudiante()).isEqualTo(ana.getId());
            assertThat(e.estadoHabilitacion()).isEqualTo(EstadoHabilitacion.PENDIENTE);
            assertThat(e.motivo()).isNull();
        });
        assertThat(inscritos()).containsExactly(ana.getId());
        assertThatThrownBy(() -> habilitacionService.asociar(EXAMEN, PARALELO, ana.getCi()))
                .isInstanceOf(EstudianteDuplicadoException.class);
    }

    @Test
    void asociarLoteInformaYaAsociadosYNoEncontradosSinDetenerAlResto() {
        Estudiante ana = estudiante("Ana");
        Estudiante luis = estudiante("Luis");
        Estudiante rosa = estudiante("Rosa");
        habilitacionService.asociar(EXAMEN, PARALELO, rosa.getCodigoSis());

        // Luis llega por código y por CI: debe asociarse una sola vez.
        AsociacionLoteResponse resultado = habilitacionService.asociarLote(EXAMEN, PARALELO, List.of(
                ana.getCodigoSis(), " " + luis.getCi() + " ", luis.getCodigoSis(), rosa.getCi(), "000", ""));

        assertThat(resultado.asociados()).isEqualTo(2);
        assertThat(resultado.yaAsociados()).containsExactly(rosa.getCi());
        assertThat(resultado.noEncontrados()).containsExactly("000");
        assertThat(resultado.estudiantes()).extracting(EstudianteHabilitacionResponse::idEstudiante)
                .containsExactlyInAnyOrder(ana.getId(), luis.getId(), rosa.getId());
        assertThat(inscritos()).containsExactlyInAnyOrder(ana.getId(), luis.getId(), rosa.getId());
    }

    @Test
    void asociarInscritosSoloAgregaLosQueFaltanSinDuplicarLaInscripcion() {
        Estudiante ana = estudiante("Ana");
        Estudiante luis = estudiante("Luis");
        estudiante("Sin inscripción");
        inscribir(ana);
        inscribir(luis);
        habilitacionService.asociar(EXAMEN, PARALELO, ana.getCodigoSis());

        AsociacionLoteResponse resultado = habilitacionService.asociarInscritos(EXAMEN, PARALELO);

        assertThat(resultado.asociados()).isEqualTo(1);
        assertThat(resultado.estudiantes()).extracting(EstudianteHabilitacionResponse::idEstudiante)
                .containsExactlyInAnyOrder(ana.getId(), luis.getId());
        assertThat(inscritos()).containsExactlyInAnyOrder(ana.getId(), luis.getId());
        assertThat(habilitacionService.asociarInscritos(EXAMEN, PARALELO).asociados()).isZero();
    }

    @Test
    void habilitarYDeshabilitarConMotivoDeUnoOVariosALaVez() {
        Estudiante ana = estudiante("Ana");
        Estudiante luis = estudiante("Luis");
        habilitacionService.asociarLote(EXAMEN, PARALELO, List.of(ana.getCodigoSis(), luis.getCodigoSis()));

        List<EstudianteHabilitacionResponse> habilitados = habilitacionService.actualizar(EXAMEN, PARALELO,
                new ActualizarHabilitacionRequest(List.of(ana.getId(), luis.getId()), EstadoHabilitacion.HABILITADO, null));
        assertThat(habilitados).extracting(EstudianteHabilitacionResponse::estadoHabilitacion)
                .containsOnly(EstadoHabilitacion.HABILITADO);

        List<EstudianteHabilitacionResponse> lista = habilitacionService.actualizar(EXAMEN, PARALELO,
                new ActualizarHabilitacionRequest(List.of(luis.getId()), EstadoHabilitacion.NO_HABILITADO, "  Deuda en biblioteca "));
        assertThat(estadoDe(lista, ana)).isEqualTo(EstadoHabilitacion.HABILITADO);
        assertThat(lista).filteredOn(e -> e.idEstudiante().equals(luis.getId())).singleElement().satisfies(e -> {
            assertThat(e.estadoHabilitacion()).isEqualTo(EstadoHabilitacion.NO_HABILITADO);
            assertThat(e.motivo()).isEqualTo("Deuda en biblioteca");
        });
        assertThat(jdbcTemplate.queryForObject(
                "SELECT habilitado FROM asistencia_examen WHERE id_estudiante = ?", Boolean.class, luis.getId()))
                .isFalse();
    }

    @Test
    void noHabilitadoSinMotivoSeRechazaSinCambiarNada() {
        Estudiante ana = estudiante("Ana");
        habilitacionService.asociar(EXAMEN, PARALELO, ana.getCodigoSis());

        assertThatThrownBy(() -> habilitacionService.actualizar(EXAMEN, PARALELO,
                new ActualizarHabilitacionRequest(List.of(ana.getId()), EstadoHabilitacion.NO_HABILITADO, "   ")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("razón");
        assertThat(estadoDe(habilitacionService.listar(EXAMEN, PARALELO), ana)).isEqualTo(EstadoHabilitacion.PENDIENTE);
    }

    @Test
    void volverAPendienteDescartaElMotivo() {
        Estudiante ana = estudiante("Ana");
        habilitacionService.asociar(EXAMEN, PARALELO, ana.getCodigoSis());
        habilitacionService.actualizar(EXAMEN, PARALELO,
                new ActualizarHabilitacionRequest(List.of(ana.getId()), EstadoHabilitacion.NO_HABILITADO, "Deuda"));

        List<EstudianteHabilitacionResponse> lista = habilitacionService.actualizar(EXAMEN, PARALELO,
                new ActualizarHabilitacionRequest(List.of(ana.getId()), EstadoHabilitacion.PENDIENTE, "ignorado"));

        assertThat(lista).singleElement().satisfies(e -> {
            assertThat(e.estadoHabilitacion()).isEqualTo(EstadoHabilitacion.PENDIENTE);
            assertThat(e.motivo()).isNull();
        });
    }

    @Test
    void cambiarEstadoDeUnEstudianteNoAsociadoSeRechaza() {
        Estudiante ana = estudiante("Ana");
        Estudiante ajeno = estudiante("Ajeno");
        habilitacionService.asociar(EXAMEN, PARALELO, ana.getCodigoSis());

        assertThatThrownBy(() -> habilitacionService.actualizar(EXAMEN, PARALELO,
                new ActualizarHabilitacionRequest(List.of(ana.getId(), ajeno.getId()), EstadoHabilitacion.HABILITADO, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no están asociados");
        assertThat(estadoDe(habilitacionService.listar(EXAMEN, PARALELO), ana)).isEqualTo(EstadoHabilitacion.PENDIENTE);
    }

    private static EstadoHabilitacion estadoDe(List<EstudianteHabilitacionResponse> lista, Estudiante estudiante) {
        return lista.stream().filter(e -> e.idEstudiante().equals(estudiante.getId()))
                .findFirst().orElseThrow().estadoHabilitacion();
    }

    private Estudiante estudiante(String nombre) {
        int n = SECUENCIA.incrementAndGet();
        Estudiante e = new Estudiante();
        e.setCodigoSis("2026990" + String.format("%02d", n));
        e.setCi("998877" + String.format("%02d", n));
        e.setNombre(nombre);
        e.setApellidos("Prueba");
        e.setEmail("habilitacion" + n + "@umss.edu");
        return estudianteRepository.saveAndFlush(e);
    }

    private void inscribir(Estudiante e) {
        jdbcTemplate.update("""
                INSERT INTO inscripcion_paralelo (id_estudiante, id_paralelo, id_materia, id_docente, estado)
                VALUES (?, ?, ?, ?, 'inscrito')
                """, e.getId(), PARALELO, MATERIA, DOCENTE);
    }

    private List<Integer> inscritos() {
        return jdbcTemplate.queryForList("""
                SELECT id_estudiante FROM inscripcion_paralelo
                WHERE id_paralelo = ? AND id_materia = ? AND id_docente = ?
                """, Integer.class, PARALELO, MATERIA, DOCENTE);
    }
}
