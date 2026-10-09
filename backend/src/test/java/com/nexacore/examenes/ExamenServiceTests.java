package com.nexacore.examenes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.dto.NormaParticularRequest;
import com.nexacore.examenes.exceptions.ConflictoExamenException;
import com.nexacore.examenes.exceptions.ExamenNoEncontradoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.Docente;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenAula;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.Paralelo;
import com.nexacore.examenes.models.ParaleloId;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.Mockito.times;
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
    @Mock EstudianteRepository estudianteRepository;
    @Mock AsistenciaExamenRepository asistenciaExamenRepository;
    @Mock EntityManager entityManager;
    @Mock ExamenAulaRepository examenAulaRepository;

    ExamenService service;

    @BeforeEach
    void preparar() {
        service = new ExamenService(examenRepository, ambienteRepository, materiaRepository,
                docenteRepository, paraleloRepository, usuarioRepository, estudianteRepository,
                asistenciaExamenRepository, new ObjectMapper(), examenAulaRepository);
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
    }

    @Test
    void crearRegistraElExamenProgramadoSiNoHayConflictos() {
        prepararCatalogo();
        prepararRespuesta();
        prepararRegistro();
        // Termina justo cuando empieza el nuevo: contiguos, no se cruzan.
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA))
                .thenReturn(List.of(examen(90, AMBIENTE, 30, LocalTime.of(8, 0), 60)));

        ExamenResponse creado = service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90));

        assertThat(creado.idExamen()).isEqualTo(50);
        assertThat(creado.estado()).isEqualTo("programado");
        assertThat(creado.ambienteNombre()).isEqualTo("691A");
        assertThat(creado.ambienteUbicacion()).isEqualTo("FCyT UMSS");
    }

    @Test
    void crearRechazaSiElAmbienteYaTieneUnExamenQueSeCruza() {
        when(ambienteRepository.bloquear(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA))
                .thenReturn(List.of(examen(90, AMBIENTE, 30, LocalTime.of(8, 0), 120)));

        assertThatThrownBy(() -> service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90)))
                .isInstanceOf(ConflictoExamenException.class)
                .hasMessageContaining("ya tiene un examen el");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void elMismoDocentePuedeTenerOtroExamenALaMismaHoraEnOtraAula() {
        // Otra materia, misma hora, otra aula: solo se verifica que el aula esté libre.
        prepararCatalogo();
        prepararRespuesta();
        prepararRegistro();
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());

        ExamenResponse creado = service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90));

        assertThat(creado.estado()).isEqualTo("programado");
    }

    @Test
    void crearRechazaUnaFechaPasada() {
        when(ambienteRepository.bloquear(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
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
        prepararRespuesta();
        Examen propio = examen(50, AMBIENTE, DOCENTE, LocalTime.of(9, 0), 90);
        when(examenRepository.findById(any())).thenReturn(Optional.of(propio));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of(propio));
        when(examenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ExamenResponse editado = service.actualizar(50, PARALELO, actualizarRequest(LocalTime.of(9, 0), 120));

        assertThat(editado.duracionMinutos()).isEqualTo(120);
    }

    @Test
    void actualizarResponde404SiElExamenNoExiste() {
        when(examenRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar(99, PARALELO, actualizarRequest(LocalTime.of(9, 0), 90)))
                .isInstanceOf(ExamenNoEncontradoException.class);
    }

    @Test
    void cancelarResponde404SiElExamenNoExiste() {
        when(examenRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancelar(99, PARALELO))
                .isInstanceOf(ExamenNoEncontradoException.class);
    }

    @Test
    void listarCargaLosCatalogosUnaSolaVezParaTodosLosExamenes() {
        prepararRespuesta();
        when(examenRepository.findAllByOrderByFechaDescHoraInicioDesc()).thenReturn(List.of(
                examen(50, AMBIENTE, DOCENTE, LocalTime.of(8, 0), 60),
                examen(51, AMBIENTE, DOCENTE, LocalTime.of(10, 0), 60),
                examen(52, AMBIENTE, DOCENTE, LocalTime.of(12, 0), 60)));

        List<ExamenResponse> examenes = service.listar();

        assertThat(examenes).extracting(ExamenResponse::docente).containsOnly("Ana Rojas");
        verify(materiaRepository, times(1)).findAllById(any());
        verify(docenteRepository, times(1)).findAllConUsuario(any());
        verify(ambienteRepository, times(1)).findAllById(any());
        verify(docenteRepository, never()).findById(any());
    }

    @Test
    void crearRechazaUnDocenteInactivo() {
        when(ambienteRepository.bloquear(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        when(materiaRepository.findById(MATERIA)).thenReturn(Optional.of(materia()));
        Docente inactivo = docente();
        inactivo.getUsuario().setEstado("inactivo");
        when(docenteRepository.findById(DOCENTE)).thenReturn(Optional.of(inactivo));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());

        assertThatThrownBy(() -> service.crear(crearRequest(AMBIENTE, LocalTime.of(9, 0), 90)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no está habilitado");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearSinIdDeDocenteSoloAceptaElNombreCompletoExacto() {
        when(ambienteRepository.bloquear(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        when(materiaRepository.findById(MATERIA)).thenReturn(Optional.of(materia()));
        when(docenteRepository.findByNombreCompleto("Ana")).thenReturn(List.of());
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());
        CrearExamenRequest inventado = new CrearExamenRequest("Cálculo I", "Ana", FECHA,
                LocalTime.of(9, 0), 90, AMBIENTE, List.of(), List.of(), MATERIA, null);

        assertThatThrownBy(() -> service.crear(inventado))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Selecciona un docente");
        verify(examenRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ababababababab",          // patrón repetitivo
            "jajajajajajaja",          // patrón repetitivo
            "Prohibido <script> aquí", // caracteres no permitidos
            "###########",             // solo caracteres especiales
    })
    void crearRechazaNormasSinContenidoReal(String norma) {
        prepararCatalogo();
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());
        prepararParalelo();

        assertThatThrownBy(() -> service.crear(new CrearExamenRequest("Cálculo I", "Ana Rojas", FECHA,
                LocalTime.of(9, 0), 90, AMBIENTE, List.of(norma), List.of(), MATERIA, DOCENTE)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Norma general");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearAceptaNormasConNumerosYSignosDentroDeTexto() {
        prepararCatalogo();
        prepararRespuesta();
        prepararRegistro();
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());
        when(estudianteRepository.existsById(7)).thenReturn(true);

        ExamenResponse creado = service.crear(new CrearExamenRequest("Cálculo I", "Ana Rojas", FECHA,
                LocalTime.of(9, 0), 90, AMBIENTE,
                List.of("CI: original y vigente", "Tolerancia de 30 minutos"),
                List.of(new NormaParticularRequest("Luis Paz", "Tiempo adicional de 15 min", 7)),
                MATERIA, DOCENTE));

        assertThat(creado.normasGenerales()).containsExactly("CI: original y vigente", "Tolerancia de 30 minutos");
    }

    @Test
    void crearRechazaNormaParticularSinEstudianteDelRegistro() {
        prepararCatalogo();
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());
        prepararParalelo();

        assertThatThrownBy(() -> service.crear(new CrearExamenRequest("Cálculo I", "Ana Rojas", FECHA,
                LocalTime.of(9, 0), 90, AMBIENTE, List.of(),
                List.of(new NormaParticularRequest("Alguien Inventado", "Tiempo adicional de 15 min")),
                MATERIA, DOCENTE)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("selecciona un estudiante registrado");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearConAulaAdicionalExigeAforoEnTodasLasAulas() {
        prepararCatalogo();
        when(ambienteRepository.bloquear(OTRO_AMBIENTE)).thenReturn(Optional.of(ambiente(OTRO_AMBIENTE)));
        when(examenRepository.findByAmbienteAndFecha(any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> service.crear(crearConAulas(List.of(OTRO_AMBIENTE))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("registra el aforo de");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearRechazaAulaAdicionalOcupadaEnEseHorario() {
        prepararCatalogo();
        when(ambienteRepository.bloquear(OTRO_AMBIENTE)).thenReturn(Optional.of(ambiente(OTRO_AMBIENTE)));
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());
        when(examenRepository.findByAmbienteAndFecha(OTRO_AMBIENTE, FECHA))
                .thenReturn(List.of(examen(91, OTRO_AMBIENTE, 30, LocalTime.of(9, 30), 60)));

        assertThatThrownBy(() -> service.crear(crearConAulas(List.of(OTRO_AMBIENTE))))
                .isInstanceOf(ConflictoExamenException.class)
                .hasMessageContaining("ya tiene un examen el");
        verify(examenRepository, never()).save(any());
    }

    @Test
    void crearRechazaAulaAdicionalRepetida() {
        prepararCatalogo();
        when(examenRepository.findByAmbienteAndFecha(AMBIENTE, FECHA)).thenReturn(List.of());

        assertThatThrownBy(() -> service.crear(crearConAulas(List.of(AMBIENTE))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("debe ser distinta");
    }

    @Test
    void crearGuardaLasAulasAdicionalesEnOrden() {
        when(ambienteRepository.bloquear(AMBIENTE)).thenReturn(Optional.of(conAforo(ambiente(AMBIENTE), 40)));
        when(ambienteRepository.bloquear(OTRO_AMBIENTE)).thenReturn(Optional.of(conAforo(ambiente(OTRO_AMBIENTE), 30)));
        when(materiaRepository.findById(MATERIA)).thenReturn(Optional.of(materia()));
        when(docenteRepository.findById(DOCENTE)).thenReturn(Optional.of(docente()));
        when(examenRepository.findByAmbienteAndFecha(any(), any())).thenReturn(List.of());
        prepararRespuesta();
        prepararRegistro();

        service.crear(crearConAulas(List.of(OTRO_AMBIENTE)));

        ArgumentCaptor<List<ExamenAula>> filas = ArgumentCaptor.forClass(List.class);
        verify(examenAulaRepository).saveAll(filas.capture());
        assertThat(filas.getValue()).singleElement().satisfies(fila -> {
            assertThat(fila.getId().getIdAmbiente()).isEqualTo(OTRO_AMBIENTE);
            assertThat(fila.getOrden()).isEqualTo((short) 1);
        });
    }

    private static CrearExamenRequest crearConAulas(List<Integer> adicionales) {
        return new CrearExamenRequest("Cálculo I", "Ana Rojas", FECHA, LocalTime.of(9, 0), 90, AMBIENTE,
                List.of(), List.of(), MATERIA, DOCENTE, adicionales);
    }

    private static Ambiente conAforo(Ambiente ambiente, int capacidad) {
        ambiente.setCapacidad(capacidad);
        return ambiente;
    }

    /** Lo que se consulta al validar: ambiente (bloqueado), asignatura y docente. */
    private void prepararCatalogo() {
        when(ambienteRepository.bloquear(AMBIENTE)).thenReturn(Optional.of(ambiente(AMBIENTE)));
        when(materiaRepository.findById(MATERIA)).thenReturn(Optional.of(materia()));
        when(docenteRepository.findById(DOCENTE)).thenReturn(Optional.of(docente()));
    }

    /** Lo que se consulta al armar la respuesta. */
    private void prepararRespuesta() {
        when(materiaRepository.findAllById(any())).thenReturn(List.of(materia()));
        when(docenteRepository.findAllConUsuario(any())).thenReturn(List.of(docente()));
        when(ambienteRepository.findAllById(any())).thenReturn(List.of(ambiente(AMBIENTE)));
    }

    private static Materia materia() {
        Materia materia = new Materia();
        materia.setId(MATERIA);
        materia.setNombre("Cálculo I");
        materia.setSigla("MAT-101");
        return materia;
    }

    private static Docente docente() {
        Usuario usuario = new Usuario();
        usuario.setNombre("Ana");
        usuario.setApellidos("Rojas");
        Docente docente = new Docente();
        docente.setIdUsuario(DOCENTE);
        docente.setUsuario(usuario);
        return docente;
    }

    private void prepararParalelo() {
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
        ambiente.setUbicacion("FCyT UMSS");
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
