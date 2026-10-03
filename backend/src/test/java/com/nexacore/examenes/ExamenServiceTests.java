package com.nexacore.examenes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.exceptions.ConflictoAmbienteException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.Docente;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.Paralelo;
import com.nexacore.examenes.models.ParaleloId;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.repositories.ParaleloRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.ExamenService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Registro y edición de exámenes: fecha válida y conflictos de horario por ambiente y por docente. */
@ExtendWith(MockitoExtension.class)
class ExamenServiceTests {

    private static final int AMBIENTE = 3;
    private static final int OTRO_AMBIENTE = 4;
    private static final int MATERIA = 8;
    private static final int DOCENTE = 20;
    private static final int PARALELO = 2;
    private static final LocalDate FECHA = LocalDate.now().plusDays(7);

    @Mock ExamenRepository examenRepository;
    @Mock AmbienteRepository ambienteRepository;
    @Mock MateriaRepository materiaRepository;
    @Mock DocenteRepository docenteRepository;
    @Mock ParaleloRepository paraleloRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock EntityManager entityManager;

    ExamenService service;

    @BeforeEach
    void preparar() {
        service = new ExamenService(examenRepository, ambienteRepository, materiaRepository,
                docenteRepository, paraleloRepository, usuarioRepository, new ObjectMapper());
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
    }

    @Test
    void crearRegistraElExamenProgramadoSiNoHayConflictos() {
        prepararCatalogo();
        prepararRegistro();
        // Termina justo cuando empieza el nuevo: contiguos, no se cruzan.
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA))
                .thenReturn(List.of(examen(90, AMBIENTE, 30, LocalTime.of(8, 0), 60)));
        when(examenRepository.findByDocenteAndFecha(DOCENTE, FECHA)).thenReturn(List.of());

        ExamenResponse creado = service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90));

        assertThat(creado.idExamen()).isEqualTo(50);
        assertThat(creado.estado()).isEqualTo("programado");
        assertThat(creado.ambienteNombre()).isEqualTo("691A");
    }

    @Test
    void crearRechazaSiElAmbienteYaTieneUnExamenQueSeCruza() {
        when(ambienteRepository.findById(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA))
                .thenReturn(List.of(examen(90, AMBIENTE, 30, LocalTime.of(8, 0), 120)));

        assertThatThrownBy(() -> service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90)))
                .isInstanceOf(ConflictoAmbienteException.class)
                .hasMessageContaining("El ambiente ya tiene un examen");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearRechazaSiElDocenteYaTieneUnExamenQueSeCruzaEnOtroAmbiente() {
        prepararCatalogo();
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());
        when(examenRepository.findByDocenteAndFecha(DOCENTE, FECHA))
                .thenReturn(List.of(examen(90, OTRO_AMBIENTE, DOCENTE, LocalTime.of(9, 30), 60)));

        assertThatThrownBy(() -> service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90)))
                .isInstanceOf(ConflictoAmbienteException.class)
                .hasMessageContaining("El docente ya tiene un examen");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearRechazaUnaFechaPasada() {
        when(ambienteRepository.findById(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        CrearExamenRequest ayer = new CrearExamenRequest("Cálculo I", "Ana Rojas", LocalDate.now().minusDays(1),
                LocalTime.of(9, 0), 90, AMBIENTE, List.of(), List.of(), MATERIA, DOCENTE);

        assertThatThrownBy(() -> service.crear(ayer))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fecha anterior a hoy");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void actualizarNoChocaConElPropioExamen() {
        prepararCatalogo();
        Examen propio = examen(50, AMBIENTE, DOCENTE, LocalTime.of(9, 0), 90);
        when(examenRepository.findById(any())).thenReturn(Optional.of(propio));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of(propio));
        when(examenRepository.findByDocenteAndFecha(DOCENTE, FECHA)).thenReturn(List.of(propio));
        when(examenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ExamenResponse editado = service.actualizar(50, PARALELO, actualizarRequest(LocalTime.of(9, 0), 120));

        assertThat(editado.duracionMinutos()).isEqualTo(120);
    }

    @Test
    void actualizarRechazaSiElNuevoHorarioCruzaOtroExamenDelDocente() {
        prepararCatalogo();
        Examen propio = examen(50, AMBIENTE, DOCENTE, LocalTime.of(9, 0), 90);
        when(examenRepository.findById(any())).thenReturn(Optional.of(propio));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of(propio));
        when(examenRepository.findByDocenteAndFecha(DOCENTE, FECHA)).thenReturn(List.of(
                propio, examen(91, OTRO_AMBIENTE, DOCENTE, LocalTime.of(11, 0), 60)));

        assertThatThrownBy(() -> service.actualizar(50, PARALELO, actualizarRequest(LocalTime.of(9, 0), 150)))
                .isInstanceOf(ConflictoAmbienteException.class)
                .hasMessageContaining("El docente ya tiene un examen");
        verify(examenRepository, never()).save(any());
    }

    private void prepararCatalogo() {
        when(ambienteRepository.findById(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        Materia materia = new Materia();
        materia.setId(MATERIA);
        materia.setNombre("Cálculo I");
        materia.setSigla("MAT-101");
        when(materiaRepository.findById(MATERIA)).thenReturn(Optional.of(materia));
        Usuario usuario = new Usuario();
        usuario.setNombre("Ana");
        usuario.setApellidos("Rojas");
        Docente docente = new Docente();
        docente.setIdUsuario(DOCENTE);
        docente.setUsuario(usuario);
        when(docenteRepository.findById(DOCENTE)).thenReturn(Optional.of(docente));
    }

    private void prepararRegistro() {
        ParaleloId pid = new ParaleloId();
        pid.setIdParalelo(PARALELO);
        pid.setIdMateria(MATERIA);
        pid.setIdDocente(DOCENTE);
        Paralelo paralelo = new Paralelo();
        paralelo.setId(pid);
        when(paraleloRepository.findFirstByMateriaAndDocente(MATERIA, DOCENTE)).thenReturn(Optional.of(paralelo));
        Query secuencia = mock(Query.class);
        when(secuencia.getSingleResult()).thenReturn(50L);
        when(entityManager.createNativeQuery(anyString())).thenReturn(secuencia);
        when(examenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Ambiente ambiente(int id) {
        Ambiente ambiente = new Ambiente();
        ambiente.setId(id);
        ambiente.setNombre("691A");
        return ambiente;
    }

    private static Examen examen(int idExamen, int idAmbiente, int idDocente, LocalTime inicio, int duracion) {
        ExamenId id = new ExamenId();
        id.setIdExamen(idExamen);
        id.setIdParalelo(PARALELO);
        Examen examen = new Examen();
        examen.setId(id);
        examen.setIdMateria(MATERIA);
        examen.setIdDocente(idDocente);
        examen.setIdAmbiente(idAmbiente);
        examen.setFecha(FECHA);
        examen.setHoraInicio(inicio);
        examen.setDuracionMinutos(duracion);
        examen.setEstado("programado");
        return examen;
    }

    private static CrearExamenRequest crearRequest(int idAmbiente, LocalTime inicio, int duracion) {
        return new CrearExamenRequest("Cálculo I", "Ana Rojas", FECHA, inicio, duracion, idAmbiente,
                List.of(), List.of(), MATERIA, DOCENTE);
    }

    private static ActualizarExamenRequest actualizarRequest(LocalTime inicio, int duracion) {
        return new ActualizarExamenRequest("Cálculo I", "Ana Rojas", FECHA, inicio, duracion, AMBIENTE,
                List.of(), List.of(), MATERIA, DOCENTE, List.of(), List.of());
    }
}
