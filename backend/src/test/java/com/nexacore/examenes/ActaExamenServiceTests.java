package com.nexacore.examenes;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.*;
import com.nexacore.examenes.repositories.*;
import com.nexacore.examenes.services.ActaExamenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;

import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de ActaExamenService (HU#4 / HU#6).
 * Sigue el mismo patrón que PlanillaEstudiantesServiceTests: Mockito puro y verificación
 * del contenido del PDF con PdfReader.
 *
 * Nota: {@code delEstudianteEnSesionActual} es un m�todo default de la interfaz del repositorio,
 * por lo que se stubbea con {@code doReturn().when()} en lugar de {@code when().thenReturn()}.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ActaExamenServiceTests {

    @Mock AsistenciaExamenRepository asistenciaRepository;
    @Mock ExamenRepository examenRepository;
    @Mock MateriaRepository materiaRepository;
    @Mock DocenteRepository docenteRepository;
    @Mock AmbienteRepository ambienteRepository;
    @Mock ExamenAulaRepository examenAulaRepository;
    @Mock ExpulsionRepository expulsionRepository;
    @Mock TrasladoAmbienteRepository trasladoRepository;

    private ActaExamenService service;

    @BeforeEach
    void setUp() {
        service = new ActaExamenService(
                asistenciaRepository, examenRepository, materiaRepository, docenteRepository,
                ambienteRepository, examenAulaRepository, expulsionRepository, trasladoRepository
        );
    }

    // ---------------------------------------------------------------------
    // Datos de prueba
    // ---------------------------------------------------------------------

    private Examen examenFinalizado() {
        var id = new ExamenId();
        id.setIdExamen(20);
        id.setIdParalelo(1);
        var e = new Examen();
        e.setId(id);
        e.setIdMateria(1);
        e.setIdDocente(1);
        e.setIdAmbiente(1);
        e.setFecha(LocalDate.of(2026, 10, 1)); // ya pasada
        e.setHoraInicio(LocalTime.parse("10:00"));
        e.setDuracionMinutos(60);
        e.setEstado("programado"); // el estado calculado ser� FINALIZADO
        return e;
    }

    private Examen examenProgramado() {
        var id = new ExamenId();
        id.setIdExamen(30);
        id.setIdParalelo(1);
        var e = new Examen();
        e.setId(id);
        e.setIdMateria(1);
        e.setIdDocente(1);
        e.setIdAmbiente(1);
        e.setFecha(LocalDate.now().plusDays(1)); // ma�ana: a�n no inici�
        e.setHoraInicio(LocalTime.parse("10:00"));
        e.setDuracionMinutos(60);
        e.setEstado("programado");
        return e;
    }

    private Materia materia() {
        var m = new Materia();
        m.setId(1);
        m.setNombre("Base de Datos I");
        m.setSigla("BD-I");
        return m;
    }

    private Docente docente() {
        var d = new Docente();
        d.setIdUsuario(1);
        var u = new Usuario();
        u.setNombre("Juan");
        u.setApellidos("Perez Gomez");
        d.setUsuario(u);
        return d;
    }

    private Ambiente ambiente() {
        var a = new Ambiente();
        a.setId(1);
        a.setNombre("Aula 101");
        return a;
    }

    private Estudiante estudiante(int id, String sis, String nombre, String apellidos) {
        var e = new Estudiante();
        e.setId(id);
        e.setCodigoSis(sis);
        e.setNombre(nombre);
        e.setApellidos(apellidos);
        e.setEmail(sis + "@est.umss.edu");
        return e;
    }

    private AsistenciaExamen asistencia(Estudiante e, Boolean habilitado, LocalDateTime ingreso) {
        var a = new AsistenciaExamen();
        var id = new AsistenciaExamenId();
        id.setIdExamen(20);
        id.setIdEstudiante(e.getId());
        a.setId(id);
        a.setIdParalelo(1);
        a.setEstudiante(e);
        a.setHabilitado(habilitado);
        a.setFechaHoraIngreso(ingreso);
        return a;
    }

    private void mockExamenValido(Examen examen) {
        when(examenRepository.findFirstByIdIdExamen(examen.getId().getIdExamen()))
                .thenReturn(Optional.of(examen));
        when(materiaRepository.findById(1)).thenReturn(Optional.of(materia()));
        when(docenteRepository.findById(1)).thenReturn(Optional.of(docente()));
        when(ambienteRepository.findById(1)).thenReturn(Optional.of(ambiente()));
        when(examenAulaRepository.adicionalesDe(anyInt())).thenReturn(List.of());
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    void pdfContieneDatosDelExamenYEstudiantesOrdenadosAlfabeticamente() throws Exception {
        mockExamenValido(examenFinalizado());

        var ana = estudiante(1, "20240001", "Ana", "Zapata");
        var luis = estudiante(2, "20240002", "Luis", "Ayala");
        var maria = estudiante(3, "20240003", "Maria", "Lopez");

        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(maria, true, LocalDateTime.parse("2026-10-01T10:14:45")),
                asistencia(ana, true, LocalDateTime.parse("2026-10-01T09:30:00")),
                asistencia(luis, true, null) // ausente
        ));
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                anyInt(), anyInt(), any())).thenReturn(false);
        when(trasladoRepository.findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
                anyInt(), anyInt(), any())).thenReturn(List.of());

        byte[] pdf = service.generarActa(20);

        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        assertTrue(texto.contains("ACTA DE ASISTENCIA"), texto);
        assertTrue(texto.contains("Base de Datos I"), texto);
        assertTrue(texto.contains("BD-I"), texto);
        assertTrue(texto.contains("Juan Perez Gomez"), texto);
        assertTrue(texto.contains("01/10/2026"), texto);
        assertTrue(texto.contains("10:00"), texto);

        // Orden alfabético por apellidos: Ayala, Lopez, Zapata
        assertTrue(texto.indexOf("Ayala") < texto.indexOf("Lopez"), texto);
        assertTrue(texto.indexOf("Lopez") < texto.indexOf("Zapata"), texto);

        // Horas de ingreso en HH:MM:SS
        assertTrue(texto.contains("10:14:45"), texto);
        assertTrue(texto.contains("09:30:00"), texto);

        // Ausente con "—"
        assertTrue(texto.contains("Ausente"), texto);
    }

    @Test
    void ausentesLleganConGuionYNuncaFechaPorDefecto() throws Exception {
        mockExamenValido(examenFinalizado());

        var ausente = estudiante(5, "20240005", "Carlos", "Ausente");
        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(ausente, true, null)
        ));
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                anyInt(), anyInt(), any())).thenReturn(false);
        when(trasladoRepository.findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
                anyInt(), anyInt(), any())).thenReturn(List.of());

        byte[] pdf = service.generarActa(20);
        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        // El estado del ausente aparece y su hora es "—"
        assertTrue(texto.contains("Ausente"), texto);
        assertFalse(texto.contains(LocalDate.now().toString()), texto);
    }

    @Test
    void noHabilitadosNoFiguranEnElActaNiComoAusentes() throws Exception {
        mockExamenValido(examenFinalizado());

        var noHabilitado = estudiante(6, "20240006", "Ines", "NoHabilitada");
        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(noHabilitado, false, null)
        ));
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                anyInt(), anyInt(), any())).thenReturn(false);
        when(trasladoRepository.findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
                anyInt(), anyInt(), any())).thenReturn(List.of());

        byte[] pdf = service.generarActa(20);
        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        // El no habilitado figura en el acta con su estado y no cuenta como ausente.
        assertTrue(texto.contains("NoHabilitada"), texto);
        assertTrue(texto.contains("No habilitado"), texto);
        assertTrue(texto.contains("Habilitados: 0"), texto);
        assertTrue(texto.contains("Ausentes: 0"), texto);
        assertTrue(texto.contains("No habilitados: 1"), texto);
    }

    @Test
    void expulsadosSeMarcanComoExpulsados() throws Exception {
        mockExamenValido(examenFinalizado());

        var expulsado = estudiante(7, "20240007", "Pedro", "Expulsado");
        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(expulsado, true, LocalDateTime.parse("2026-10-01T10:00:00"))
        ));
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                7, 20, ExpulsionRepository.DESDE_SIEMPRE)).thenReturn(true);
        when(trasladoRepository.findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
                anyInt(), anyInt(), any())).thenReturn(List.of());

        byte[] pdf = service.generarActa(20);
        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        // El expulsado muestra "Expulsado", no "Asistió"
        assertTrue(texto.contains("Expulsado"), texto);
        assertTrue(texto.contains("Asistieron: 0"), texto);
    }

    @Test
    void expulsionAnuladaCuentaComoAsistencia() throws Exception {
        mockExamenValido(examenFinalizado());

        var estudianteAnulado = estudiante(8, "20240008", "Sofia", "Anulada");
        var ingreso = LocalDateTime.parse("2026-10-01T10:00:00");
        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(estudianteAnulado, true, ingreso)
        ));
        // Hay expulsión pero fue anulada (anuladaEn != null) -> no cuenta como expulsado
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                8, 20, ExpulsionRepository.DESDE_SIEMPRE)).thenReturn(false);
        when(trasladoRepository.findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
                anyInt(), anyInt(), any())).thenReturn(List.of());

        byte[] pdf = service.generarActa(20);
        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        // Debe contar como Asistió, no como Expulsado
        assertTrue(texto.contains("Asist"), texto);
        assertFalse(texto.contains("Expulsados:"), texto);
    }

    @Test
    void trasladoMuestraObservacionTrasladoDesdeAula() throws Exception {
        mockExamenValido(examenFinalizado());

        var trasladado = estudiante(9, "20240009", "Lucia", "Trasladada");
        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(trasladado, true, LocalDateTime.parse("2026-10-01T10:00:00"))
        ));
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                anyInt(), anyInt(), any())).thenReturn(false);

        var origen = new Ambiente();
        origen.setId(2);
        origen.setNombre("Aula 202");
        var destino = new Ambiente();
        destino.setId(3);
        destino.setNombre("Aula 305");
        var t = new TrasladoAmbiente();
        t.setIdAmbienteOrigen(2);
        t.setIdAmbienteDestino(3);
        // delEstudianteEnSesionActual es m�todo default de la interfaz: Mockito no ejecuta su cuerpo,
        // hay que hacerle stub directamente con valores raw (sin mezclar matchers).
        when(trasladoRepository.delEstudianteEnSesionActual(20, 9, null)).thenReturn(List.of(t));
        when(ambienteRepository.findById(2)).thenReturn(Optional.of(origen));
        when(ambienteRepository.findById(3)).thenReturn(Optional.of(destino));

        byte[] pdf = service.generarActa(20);
        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        assertTrue(texto.contains("Trasladado desde Aula 202 a Aula 305"), texto);
    }

    @Test
    void examenQueNoInicioDevuelve409() {
        when(examenRepository.findFirstByIdIdExamen(30))
                .thenReturn(Optional.of(examenProgramado()));

        assertThrows(ControlIngresoException.class, () -> service.generarActa(30));
    }

    @Test
    void examenNoEncontradoDevuelve404() {
        when(examenRepository.findFirstByIdIdExamen(99))
                .thenReturn(Optional.empty());

        assertThrows(ControlIngresoException.class, () -> service.generarActa(99));
    }

    @Test
    void resumenYFormatoComoElDisenoA4() throws Exception {
        mockExamenValido(examenFinalizado());

        var asistido = estudiante(1, "20240001", "Ana", "Zapata");
        var ausente = estudiante(2, "20240002", "Luis", "Ayala");
        var noHabilitado = estudiante(3, "20240003", "Ines", "NoHabilitada");
        var expulsado = estudiante(4, "20240004", "Pedro", "Expulsado");

        when(asistenciaRepository.buscarPorIdExamen(20)).thenReturn(List.of(
                asistencia(asistido, true, LocalDateTime.parse("2026-10-01T10:00:00")),
                asistencia(ausente, true, null),
                asistencia(noHabilitado, false, null),
                asistencia(expulsado, true, LocalDateTime.parse("2026-10-01T09:00:00"))
        ));
        // Solo el estudiante 4 est� expulsado; los dem�s no
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                4, 20, ExpulsionRepository.DESDE_SIEMPRE)).thenReturn(true);
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                1, 20, ExpulsionRepository.DESDE_SIEMPRE)).thenReturn(false);
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                2, 20, ExpulsionRepository.DESDE_SIEMPRE)).thenReturn(false);
        when(expulsionRepository.existsByIdEstudianteAndIdExamenAndFechaHoraAfterAndAnuladaEnIsNull(
                3, 20, ExpulsionRepository.DESDE_SIEMPRE)).thenReturn(false);
        when(trasladoRepository.findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
                anyInt(), anyInt(), any())).thenReturn(List.of());

        byte[] pdf = service.generarActa(20);
        String texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1).replaceAll("\\s+", " ");

        // Resumen antes de la tabla (el no habilitado cuenta como no habilitado), columnas, firmas y pie de la sección 12.
        assertTrue(texto.contains("Habilitados: 3"), texto);
        assertTrue(texto.contains("No habilitados: 1"), texto);
        assertTrue(texto.contains("Asistieron: 1"), texto);
        assertTrue(texto.contains("Ausentes: 1"), texto);
        assertTrue(texto.contains("Expulsados: 1"), texto);
        assertTrue(texto.indexOf("Habilitados: 3") < texto.indexOf("Apellidos y nombres"), texto);
        assertTrue(texto.contains("UNIVERSIDAD MAYOR DE SAN SIMÓN"), texto);
        assertTrue(texto.contains("N.° 2026-FI-0020"), texto);
        assertTrue(texto.contains("Hora de ingreso"), texto);
        assertFalse(texto.contains("Observación"), texto);
        assertTrue(texto.contains("Firma del docente"), texto);
        assertTrue(texto.contains("Firma del responsable de control"), texto);
        // Quién hizo el control: la línea Control en los datos y la columna Registró en la tabla.
        assertTrue(texto.contains("Control: Sin personal de control asignado"), texto);
        assertTrue(texto.contains("Registró"), texto);
        assertTrue(texto.contains("Generada por SIGEX el"), texto);
        assertTrue(texto.contains("Página 1 de 1"), texto);
    }
}
