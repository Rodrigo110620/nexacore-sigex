package com.nexacore.examenes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.*;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.CatalogoIncidenciaRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.IncidenciaRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.RegistroControlIngresoRepository;
import com.nexacore.examenes.services.ControlIngresoService;
import com.nexacore.examenes.services.RepartoAulasService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ControlIngresoServiceTests {
    private AsistenciaExamenRepository asistenciaRepository;
    private UsuarioRepository usuarioRepository;
    private ControlIngresoService service;
    private RegistroControlIngresoRepository registroRepository;
    private CatalogoIncidenciaRepository catalogoRepository;
    private IncidenciaRepository incidenciaRepository;
    private AsistenciaExamen asistencia;

    @BeforeEach
    void preparar() {
        asistenciaRepository = mock(AsistenciaExamenRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        registroRepository = mock(RegistroControlIngresoRepository.class);
        catalogoRepository = mock(CatalogoIncidenciaRepository.class);
        incidenciaRepository = mock(IncidenciaRepository.class);
        service = new ControlIngresoService(
                asistenciaRepository,
                catalogoRepository,
                incidenciaRepository,
                usuarioRepository,
                mock(EstudianteRepository.class),
                registroRepository,
                new ObjectMapper(),
                repartoSinAula());
        asistencia = crearAsistencia();

        Usuario control = new Usuario();
        control.setId(7);
        control.setNombre("Carla");
        control.setApellidos("Control");
        when(usuarioRepository.findByEmail("control@umss.edu.bo")).thenReturn(Optional.of(control));
        when(asistenciaRepository.buscarParaAutorizar(10, 20)).thenReturn(Optional.of(asistencia));
        when(asistenciaRepository.autorizarConFechaServidor(10, 20, 5, 7, "Sin novedades")).thenReturn(1);
        when(asistenciaRepository.autorizarConFechaServidor(10, 20, 5, 7, null)).thenReturn(1);
        when(asistenciaRepository.obtenerFechaHoraIngreso(10, 20))
                .thenReturn(LocalDateTime.parse("2026-09-25T16:00:00"));
        when(asistenciaRepository.obtenerFechaHoraServidor())
                .thenReturn(LocalDateTime.parse("2026-09-25T16:00:00"));
    }

    @Test
    void deniegaPorDecisionControlSinAutorizarAsistencia() {
        var request = new AutorizarIngresoRequest(10, 20, "Documento inválido", false, List.of(), List.of());
        var response = service.denegar(request, "control@umss.edu.bo");
        assertFalse(response.autorizado());
        assertEquals("DENEGADO_CONTROL", response.resultado());
        assertEquals("Documento inválido", response.causa());
        assertNotNull(response.fechaHoraIngreso());
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
        verify(registroRepository).registrar(20, 40, 10, 7, "DENEGADO", "Documento inválido", "[]", "Documento inválido");
    }

    /** BUG-D02: se guarda en el orden de antes: razón — detalle — observaciones. */
    @Test
    void deniegaConDetalleAdicionalEntreLaRazonYLasObservaciones() {
        var request = new AutorizarIngresoRequest(10, 20, "Documento inválido — Se informó al estudiante", false,
                List.of(), List.of(), "  CI vencido (2019),\n¿renovado? No.  ");
        var response = service.denegar(request, "control@umss.edu.bo");
        String causa = "Documento inválido — CI vencido (2019),\n¿renovado? No. — Se informó al estudiante";
        assertEquals(causa, response.causa());
        assertEquals("Ingreso denegado por CONTROL: " + causa, asistencia.getMotivoInhabilitacion());
        verify(registroRepository).registrar(20, 40, 10, 7, "DENEGADO", causa, "[]", causa);
    }

    @Test
    void deniegaConDetalleAdicionalSinObservaciones() {
        var request = new AutorizarIngresoRequest(10, 20, "Documento inválido", false, List.of(), List.of(), "CI vencido");
        assertEquals("Documento inválido — CI vencido", service.denegar(request, "control@umss.edu.bo").causa());
    }

    /** BUG-D02: con un detalle inválido no se deniega ni se registra nada. */
    @Test
    void rechazaDetalleAdicionalInvalidoSinEscribirDatos() {
        var request = new AutorizarIngresoRequest(10, 20, "Documento inválido", false, List.of(), List.of(), "???????");
        var error = assertThrows(IllegalArgumentException.class, () -> service.denegar(request, "control@umss.edu.bo"));
        assertEquals("El detalle adicional debe tener letras o números, no solo signos", error.getMessage());
        verify(asistenciaRepository, never()).save(any());
        verifyNoInteractions(registroRepository);
    }

    /** BUG-D01: con "Otra razón" el detalle es obligatorio; sin él no se deniega ni se registra nada. */
    @Test
    void otraRazonSinDetalleResponde400SinEscribirDatos() {
        for (String detalle : new String[] {null, ""}) {
            var request = new AutorizarIngresoRequest(10, 20, "Otra razón — Se informó al estudiante", false,
                    List.of(), List.of(), detalle);
            var error = assertThrows(ControlIngresoException.class, () -> service.denegar(request, "control@umss.edu.bo"));
            assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
            assertEquals("Especifique la razón de la denegación", error.getMessage());
        }
        verify(asistenciaRepository, never()).save(any());
        verifyNoInteractions(registroRepository);
    }

    @Test
    void otraRazonConDetalleDeniegaConElDetalleTrasLaRazon() {
        var request = new AutorizarIngresoRequest(10, 20, "Otra razón — Se informó al estudiante", false,
                List.of(), List.of(), "Usó el celular en la fila");
        String causa = "Otra razón — Usó el celular en la fila — Se informó al estudiante";
        assertEquals(causa, service.denegar(request, "control@umss.edu.bo").causa());
        verify(registroRepository).registrar(20, 40, 10, 7, "DENEGADO", causa, "[]", causa);
    }

    @Test
    void denegacionExigeMotivo() {
        assertThrows(ControlIngresoException.class, () -> service.denegar(requestVacio(), "control@umss.edu.bo"));
        verifyNoInteractions(registroRepository);
    }

    @Test
    void rechazaDetalleAdicionalDeDenegacionMayorA500CaracteresAntesDeEscribir() {
        var request = new AutorizarIngresoRequest(10, 20, "Fuera de tiempo",
                false, List.of(), List.of(), "x".repeat(501));

        var error = assertThrows(IllegalArgumentException.class,
                () -> service.denegar(request, "control@umss.edu.bo"));

        assertTrue(error.getMessage().contains("no puede superar 500 caracteres"));
        verifyNoInteractions(asistenciaRepository, usuarioRepository, registroRepository, incidenciaRepository);
    }

    @Test
    void denegacionManualBloqueaAutorizacionPosterior() {
        service.denegar(new AutorizarIngresoRequest(10, 20, "Fuera de tiempo", false, List.of(), List.of()), "control@umss.edu.bo");
        assertFalse(asistencia.getHabilitado());
        verify(asistenciaRepository).save(asistencia);
        var response = service.autorizar(new AutorizarIngresoRequest(10, 20, null, true,
                List.of("Texto visible modificable"), List.of()), "control@umss.edu.bo");
        assertFalse(response.autorizado());
        assertTrue(response.causa().contains("Fuera de tiempo"));
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
    }

    @Test
    void rechazaDenegacionPosteriorAUnaAutorizacionSinEscribirDatos() {
        LocalDateTime autorizadaEn = LocalDateTime.parse("2026-09-25T12:00:00");
        asistencia.setFechaHoraIngreso(autorizadaEn);

        var error = assertThrows(ControlIngresoException.class, () -> service.denegar(
                new AutorizarIngresoRequest(10, 20, "Documento inválido", false, List.of(), List.of()),
                "control@umss.edu.bo"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals(autorizadaEn, asistencia.getFechaHoraIngreso());
        assertTrue(asistencia.getHabilitado());
        verify(asistenciaRepository, never()).save(any());
        verifyNoInteractions(registroRepository, incidenciaRepository, catalogoRepository);
    }

    @Test
    void autorizaConTimestampServidorYEvidencia() {
        var request = new AutorizarIngresoRequest(
                10, 20, "  Sin novedades  ", true,
                List.of("Identidad confirmada", " Material revisado "),
                List.of());

        var response = service.autorizar(request, "control@umss.edu.bo");

        assertNotNull(response.fechaHoraIngreso());
        assertEquals("Sin novedades", response.observaciones());
        assertEquals(List.of("Identidad confirmada", "Material revisado"), response.verificacionesAdicionales());
        assertEquals(7, asistencia.getIdUsuarioControl());
        assertEquals(5, asistencia.getIdAmbienteIngreso());
        assertEquals(response.fechaHoraIngreso(), asistencia.getFechaHoraIngreso());
        assertTrue(response.autorizado());
        assertEquals("AUTORIZADO", response.resultado());
        verify(asistenciaRepository).autorizarConFechaServidor(10, 20, 5, 7, "Sin novedades");
        verify(registroRepository).registrar(20, 40, 10, 7, "AUTORIZADO", null,
                "[\"Identidad confirmada\",\"Material revisado\"]", "Sin novedades");
    }

    @Test
    void rechazaObservacionesRepetitivasReportadasPorQaAntesDeEscribir() {
        var request = new AutorizarIngresoRequest(10, 20, "tttttttttttttttttttt", true, List.of(), List.of());

        var error = assertThrows(ControlIngresoException.class,
                () -> service.autorizar(request, "control@umss.edu.bo"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(asistenciaRepository, usuarioRepository, registroRepository, incidenciaRepository);
    }

    @Test
    void permiteObservacionLegitimaEnEvidenciaDeControl() {
        String observacion = "Se verificó el documento y el carnet está en buen estado.";
        when(asistenciaRepository.autorizarConFechaServidor(10, 20, 5, 7, observacion)).thenReturn(1);
        var request = new AutorizarIngresoRequest(10, 20, observacion, true, List.of(), List.of());

        var response = service.autorizar(request, "control@umss.edu.bo");

        assertTrue(response.autorizado());
        assertEquals(observacion, response.observaciones());
        verify(registroRepository).registrar(20, 40, 10, 7, "AUTORIZADO", null, "[]", observacion);
    }

    @Test
    void rechazaEstudianteNoHabilitadoYExponeMotivo() {
        asistencia.setHabilitado(false);
        asistencia.setMotivoInhabilitacion("Matrícula observada");

        var response = service.autorizar(requestVacio(), "control@umss.edu.bo");

        assertFalse(response.autorizado());
        assertEquals("DENEGADO_NO_HABILITADO", response.resultado());
        assertTrue(response.causa().contains("Matrícula observada"));
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
        verify(registroRepository).registrar(20, 40, 10, 7, "DENEGADO",
                "El estudiante no está habilitado: Matrícula observada", "[]", null);
    }

    @Test
    void rechazaEstudiantePendienteDeHabilitacion() {
        asistencia.setHabilitado(null);

        var response = service.autorizar(requestVacio(), "control@umss.edu.bo");

        assertFalse(response.autorizado());
        assertEquals("DENEGADO_NO_HABILITADO", response.resultado());
        assertEquals("El estudiante está pendiente de habilitación para este examen", response.causa());
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
    }

    @Test
    void impideAutorizarDosVeces() {
        asistencia.setFechaHoraIngreso(LocalDateTime.parse("2026-09-25T12:00:00"));

        var response = service.autorizar(requestVacio(), "control@umss.edu.bo");

        assertFalse(response.autorizado());
        assertEquals("DENEGADO_DUPLICADO", response.resultado());
        assertTrue(response.causa().contains("ya fue autorizado"));
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
        verify(registroRepository).registrar(20, 40, 10, 7, "DENEGADO",
                "El ingreso de este estudiante al examen ya fue autorizado", "[]", null);
    }

    @Test
    void obtieneNormasGeneralesYParticularesDesdeJsonDelExamen() {
        asistencia.getEstudiante().setCi("74839201");
        asistencia.getExamen().setNormas("""
                {"generales":["Presentar CI","No usar celular"],
                 "particulares":[{"estudiante":"Laura Paredes","texto":"Tiempo adicional de 30 minutos"}]}
                """);
        when(asistenciaRepository.buscarContexto(10, 20)).thenReturn(Optional.of(asistencia));

        var contexto = service.consultarContexto(10, 20);

        assertEquals(List.of("Presentar CI", "No usar celular"), contexto.normasGenerales());
        assertEquals(List.of("Tiempo adicional de 30 minutos"), contexto.normasParticulares());
        assertEquals("74839201", contexto.documento());
    }

    @Test
    void laNormaParticularSeReconocePorIdNoPorNombre() {
        // Dos estudiantes con el mismo nombre: cada uno ve solo su norma. Y la de Laura sigue
        // apareciendo aunque se guardó con su nombre anterior.
        asistencia.getEstudiante().setId(10);
        asistencia.getExamen().setNormas("""
                {"generales":["Presentar CI"],
                 "particulares":[
                   {"estudiante":"Laura Paredes","texto":"Norma de otra Laura Paredes","idEstudiante":99},
                   {"estudiante":"Laura Paredez","texto":"Tiempo adicional de 30 minutos","idEstudiante":10}]}
                """);
        when(asistenciaRepository.buscarContexto(10, 20)).thenReturn(Optional.of(asistencia));

        var contexto = service.consultarContexto(10, 20);

        assertEquals(List.of("Tiempo adicional de 30 minutos"), contexto.normasParticulares());
    }

    @Test
    void registraIncidenciaConLosIdentificadoresDelControl() {
        CatalogoIncidencia tipo = new CatalogoIncidencia();
        tipo.setId(3);
        when(catalogoRepository.findById(3)).thenReturn(Optional.of(tipo));
        when(asistenciaRepository.autorizarConFechaServidor(10, 20, 5, 7, "Material observado")).thenReturn(1);
        var request = new AutorizarIngresoRequest(
                10, 20, "Material observado", true, List.of("Identidad confirmada"),
                List.of(new com.nexacore.examenes.dto.IncidenciaIngresoRequest(3, "Celular apagado")));

        var response = service.autorizar(request, "control@umss.edu.bo");

        assertEquals(1, response.incidenciasRegistradas());
        verify(incidenciaRepository).registrar(
                20, 10, 7, 3, 40, "Celular apagado", LocalDateTime.parse("2026-09-25T16:00:00"));
    }

    @Test
    void informaIncidenciasRegistradasAlDenegarEstudianteNoHabilitado() {
        prepararTipoIncidencia(3);
        asistencia.setHabilitado(false);

        var response = service.autorizar(requestConIncidencia(false), "control@umss.edu.bo");

        assertEquals(1, response.incidenciasRegistradas());
        verify(incidenciaRepository).registrar(eq(20), eq(10), eq(7), eq(3), eq(40),
                eq("Documento observado"), any(LocalDateTime.class));
    }

    @Test
    void informaIncidenciasRegistradasEnDuplicadoDetectadoAntesDelUpdate() {
        prepararTipoIncidencia(3);
        asistencia.setFechaHoraIngreso(LocalDateTime.parse("2026-09-25T12:00:00"));

        var response = service.autorizar(requestConIncidencia(false), "control@umss.edu.bo");

        assertEquals("DENEGADO_DUPLICADO", response.resultado());
        assertEquals(1, response.incidenciasRegistradas());
    }

    @Test
    void informaIncidenciasRegistradasEnDuplicadoDetectadoPorUpdateAtomico() {
        prepararTipoIncidencia(3);
        when(asistenciaRepository.autorizarConFechaServidor(10, 20, 5, 7, null)).thenReturn(0);

        var response = service.autorizar(requestConIncidencia(true), "control@umss.edu.bo");

        assertEquals("DENEGADO_DUPLICADO", response.resultado());
        assertEquals(1, response.incidenciasRegistradas());
    }

    @Test
    void informaIncidenciasRegistradasEnDenegacionManual() {
        prepararTipoIncidencia(3);

        var response = service.denegar(new AutorizarIngresoRequest(
                10, 20, "Documento inválido", false, List.of(),
                List.of(new com.nexacore.examenes.dto.IncidenciaIngresoRequest(3, "Documento observado"))),
                "control@umss.edu.bo");

        assertEquals(1, response.incidenciasRegistradas());
    }

    @Test
    void consultaHistorialOrdenadoYConvierteVerificacionesJson() {
        RegistroControlIngresoId id = new RegistroControlIngresoId();
        id.setIdControl(91);
        id.setIdEstudiante(10);
        id.setIdExamen(20);
        id.setIdParalelo(40);
        RegistroControlIngreso registro = new RegistroControlIngreso();
        registro.setId(id);
        registro.setIdUsuarioControl(7);
        registro.setResultadoAutorizacion("DENEGADO");
        registro.setMotivoDenegacion("Matrícula observada");
        registro.setObservaciones("Se informó al estudiante");
        registro.setVerificacionesAdicionales("[\"Identidad contrastada\"]");
        registro.setFechaHora(LocalDateTime.parse("2026-09-25T16:00:00"));
        when(registroRepository.findByIdIdEstudianteAndIdIdExamenOrderByFechaHoraDesc(10, 20))
                .thenReturn(List.of(registro));
        Usuario control = new Usuario();
        control.setId(7);
        control.setNombre("Carla");
        control.setApellidos("Control");
        when(usuarioRepository.findById(7)).thenReturn(Optional.of(control));

        var historial = service.consultarHistorial(10, 20);

        assertEquals(1, historial.size());
        assertEquals(91, historial.get(0).idRegistro());
        assertEquals("DENEGADO", historial.get(0).resultado());
        assertEquals(List.of("Identidad contrastada"), historial.get(0).verificacionesAdicionales());
        assertEquals("Carla Control", historial.get(0).usuarioControl());
    }

    @Test
    void consultaRegistrosDelExamenConDatosAsociadosDelEstudianteYControl() {
        RegistroControlIngresoId id = new RegistroControlIngresoId();
        id.setIdControl(92);
        id.setIdEstudiante(10);
        id.setIdExamen(20);
        id.setIdParalelo(40);

        Estudiante estudiante = new Estudiante();
        estudiante.setNombre("Laura");
        estudiante.setApellidos("Paredes");
        estudiante.setCodigoSis("20261234");

        Usuario control = new Usuario();
        control.setId(7);
        control.setNombre("Carla");
        control.setApellidos("Control");

        RegistroControlIngreso registro = new RegistroControlIngreso();
        registro.setId(id);
        registro.setIdUsuarioControl(7);
        registro.setEstudiante(estudiante);
        registro.setUsuarioControl(control);
        registro.setResultadoAutorizacion("AUTORIZADO");
        registro.setVerificacionesAdicionales("[\"Identidad contrastada\"]");
        registro.setFechaHora(LocalDateTime.parse("2026-09-25T16:00:00"));
        when(registroRepository.listarPorExamen(20)).thenReturn(List.of(registro));

        var filas = service.consultarRegistrosExamen(20);

        assertEquals(1, filas.size());
        assertEquals(92, filas.get(0).idRegistro());
        assertEquals("Laura Paredes", filas.get(0).estudiante());
        assertEquals("20261234", filas.get(0).codigoSis());
        assertEquals("AUTORIZADO", filas.get(0).resultado());
        assertEquals("Carla Control", filas.get(0).usuarioControl());
        assertEquals(List.of("Identidad contrastada"), filas.get(0).verificacionesAdicionales());
    }

    @Test
    void registraDenegacionConObservacionesYFechaDelServidor() {
        asistencia.setHabilitado(false);
        asistencia.setMotivoInhabilitacion("Deuda pendiente");
        var request = new AutorizarIngresoRequest(10, 20, "Se notificó la causa", false, List.of(), List.of());

        var response = service.autorizar(request, "control@umss.edu.bo");

        assertFalse(response.autorizado());
        assertEquals(LocalDateTime.parse("2026-09-25T16:00:00"), response.fechaHoraIngreso());
        verify(registroRepository).registrar(
                20, 40, 10, 7, "DENEGADO",
                "El estudiante no está habilitado: Deuda pendiente", "[]", "Se notificó la causa");
    }

    @Test
    void impideAutorizarSinVerificacionSinEscribirDatos() {
        var error = assertThrows(ControlIngresoException.class,
                () -> service.autorizar(requestVacio(), "control@umss.edu.bo"));
        assertTrue(error.getMessage().contains("verificación de identidad"));
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
        verifyNoInteractions(registroRepository, incidenciaRepository);
    }

    @Test
    void unaVerificacionDistintaNoReemplazaLaVerificacionDeIdentidad() {
        var request = new AutorizarIngresoRequest(10, 20, null, false,
                List.of("Identidad biométrica cotejada / Carnet físico verificado"), List.of());
        assertThrows(ControlIngresoException.class, () -> service.autorizar(request, "control@umss.edu.bo"));
        verify(asistenciaRepository, never()).autorizarConFechaServidor(anyInt(), anyInt(), anyInt(), anyInt(), any());
        verifyNoInteractions(registroRepository, incidenciaRepository);
    }

    /** ACCS-02 CA-53/54: las observaciones, si se escriben, tienen de 10 a 100 caracteres. */
    @Test
    void rechazaObservacionesFueraDe10A100CaracteresSinEscribirDatos() {
        for (String observacion : new String[] {"Muy corta", "Presentó su carnet vigente. ".repeat(4)}) {
            var request = new AutorizarIngresoRequest(10, 20, observacion, true, List.of(), List.of());
            assertThrows(IllegalArgumentException.class, () -> service.autorizar(request, "control@umss.edu.bo"));
        }
        verifyNoInteractions(registroRepository, incidenciaRepository);
    }

    @Test
    void aceptaObservacionDeExactamente100Caracteres() {
        String observacion = "Presentó su carnet vigente y la credencial universitaria. ".repeat(2).substring(0, 100).strip();
        when(asistenciaRepository.autorizarConFechaServidor(10, 20, 5, 7, observacion)).thenReturn(1);
        var response = service.autorizar(
                new AutorizarIngresoRequest(10, 20, observacion, true, List.of(), List.of()), "control@umss.edu.bo");
        assertTrue(response.autorizado());
    }

    @Test
    void alDenegarValidaSoloLasObservacionesQueSiguenALaRazon() {
        var request = new AutorizarIngresoRequest(10, 20, "Suplantación — Corta", false, List.of(), List.of());
        assertThrows(IllegalArgumentException.class, () -> service.denegar(request, "control@umss.edu.bo"));
        verifyNoInteractions(registroRepository);
    }

    /** ACCS HU#01 CA-42: denegar no borra la razón que registró el administrador. */
    @Test
    void denegarConservaLasRazonesAnterioresDeInhabilitacion() {
        asistencia.setHabilitado(false);
        asistencia.setMotivoInhabilitacion("Deuda pendiente en caja");

        service.denegar(new AutorizarIngresoRequest(10, 20, "Fuera de tiempo", false, List.of(), List.of()),
                "control@umss.edu.bo");

        assertEquals(List.of("Deuda pendiente en caja", "Ingreso denegado por CONTROL: Fuera de tiempo"),
                ControlIngresoService.razones(asistencia.getMotivoInhabilitacion()));
    }

    @Test
    void historialIncluyeLasIncidenciasRegistradasConCadaControl() {
        LocalDateTime cuando = LocalDateTime.parse("2026-09-25T16:00:00.123456");
        RegistroControlIngresoId id = new RegistroControlIngresoId();
        id.setIdControl(93);
        id.setIdEstudiante(10);
        id.setIdExamen(20);
        id.setIdParalelo(40);
        RegistroControlIngreso registro = new RegistroControlIngreso();
        registro.setId(id);
        registro.setIdUsuarioControl(7);
        registro.setResultadoAutorizacion("AUTORIZADO");
        registro.setFechaHora(cuando);
        when(registroRepository.findByIdIdEstudianteAndIdIdExamenOrderByFechaHoraDesc(10, 20))
                .thenReturn(List.of(registro));
        when(incidenciaRepository.listarDelControl(10, 20)).thenReturn(List.of(
                new Object[] {java.sql.Timestamp.valueOf(cuando), "LLEGADA_TARDE", "Llegó 10 minutos tarde"},
                new Object[] {java.sql.Timestamp.valueOf(cuando.minusHours(1)), "OTRA_INCIDENCIA", "De otro control"}));

        var historial = service.consultarHistorial(10, 20);

        assertEquals(List.of(new com.nexacore.examenes.dto.IncidenciaRegistradaResponse(
                "LLEGADA_TARDE", "Llegó 10 minutos tarde")), historial.get(0).incidencias());
    }

    private AutorizarIngresoRequest requestVacio() {
        return new AutorizarIngresoRequest(10, 20, null, false, List.of(), List.of());
    }

    private AutorizarIngresoRequest requestConIncidencia(boolean identidadVerificada) {
        return new AutorizarIngresoRequest(10, 20, null, identidadVerificada, List.of(),
                List.of(new com.nexacore.examenes.dto.IncidenciaIngresoRequest(3, "Documento observado")));
    }

    private void prepararTipoIncidencia(int id) {
        CatalogoIncidencia tipo = new CatalogoIncidencia();
        tipo.setId(id);
        when(catalogoRepository.findById(id)).thenReturn(Optional.of(tipo));
    }

    private AsistenciaExamen crearAsistencia() {
        Estudiante estudiante = new Estudiante();
        estudiante.setNombre("Laura");
        estudiante.setApellidos("Paredes");
        estudiante.setCodigoSis("20261234");

        Materia materia = new Materia();
        materia.setSigla("INF-101");
        materia.setNombre("Introducción a la Programación");

        Paralelo paralelo = new Paralelo();
        paralelo.setMateria(materia);

        Ambiente ambiente = new Ambiente();
        ambiente.setId(5);
        ambiente.setNombre("Aula 401");

        Examen examen = new Examen();
        examen.setIdAmbiente(5);
        examen.setAmbiente(ambiente);
        examen.setParalelo(paralelo);
        examen.setNormas("Presentar documento de identidad");

        AsistenciaExamenId id = new AsistenciaExamenId();
        id.setIdEstudiante(10);
        id.setIdExamen(20);

        AsistenciaExamen registro = new AsistenciaExamen();
        registro.setId(id);
        registro.setIdParalelo(40);
        registro.setEstudiante(estudiante);
        registro.setExamen(examen);
        registro.setHabilitado(true);
        return registro;
    }
    @Test
    void autorizaCorrectamenteCuandoElAmbienteEsValido() {
        // El ambiente del examen (id: 5) coincide con el ambiente verificado
        asistencia.getExamen().setIdAmbiente(5);
        var request = new AutorizarIngresoRequest(10, 20, "Sin novedades", true, List.of("Identidad confirmada"), List.of());
        var response = service.autorizar(request, "control@umss.edu.bo");
        
        assertTrue(response.autorizado());
        assertEquals("AUTORIZADO", response.resultado());
    }

    @Test
    void verificaAsociacionDeAmbienteCorrectoEnIngreso() {
        asistencia.getExamen().setIdAmbiente(5);
        var request = new AutorizarIngresoRequest(10, 20, null, true, List.of("Identidad confirmada"), List.of());
        
        service.autorizar(request, "control@umss.edu.bo");
        
        // Comprueba que el ID del ambiente verificado se asocie de forma correcta al registro
        assertEquals(5, asistencia.getIdAmbienteIngreso());
        verify(asistenciaRepository).autorizarConFechaServidor(10, 20, 5, 7, null);
    }
    /** Reparto que no asigna aula: el ingreso queda registrado en el aula principal del examen. */
    private static RepartoAulasService repartoSinAula() {
        RepartoAulasService reparto = mock(RepartoAulasService.class);
        when(reparto.repartir(any(), any())).thenReturn(
                new RepartoAulasService.Reparto(List.of(), Map.of(), List.of(), Map.of()));
        return reparto;
    }
}
