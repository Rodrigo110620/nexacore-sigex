package com.nexacore.examenes.services;

import com.nexacore.examenes.repositories.EstudianteFotoRepository;
import com.nexacore.examenes.utils.EstadoExamen;
import com.nexacore.examenes.utils.JustificacionManual;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.dto.ExpulsionResponse;
import com.nexacore.examenes.models.Expulsion;
import com.nexacore.examenes.models.TrasladoAmbiente;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.utils.ExpulsionValidaciones;
import org.springframework.security.core.Authentication;
import com.nexacore.examenes.dto.AutorizarIngresoResponse;
import com.nexacore.examenes.dto.IncidenciaIngresoRequest;
import com.nexacore.examenes.dto.IncidenciaRegistradaResponse;
import com.nexacore.examenes.dto.ReasignarAmbienteRequest;
import com.nexacore.examenes.dto.ReasignarAmbienteResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoExamenResponse;
import com.nexacore.examenes.dto.TipoIncidenciaResponse;
import com.nexacore.examenes.dto.ContextoControlIngresoResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.AsistenciaExamenId;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Notificacion;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.CatalogoIncidencia;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.CatalogoIncidenciaRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.IncidenciaRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.RegistroControlIngresoRepository;
import com.nexacore.examenes.utils.ValidacionPalabras;
import com.nexacore.examenes.utils.ValidacionTextoLibre;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.nexacore.examenes.models.TrasladoAmbiente;
import com.nexacore.examenes.repositories.TrasladoAmbienteRepository;
import com.nexacore.examenes.repositories.AmbienteRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.List;

@Service
public class ControlIngresoService {

    static final String SIN_FOTO = "El estudiante no tiene foto registrada: no se puede verificar su identidad. "
            + "Debe registrarla en su portal o la administración desde su ficha.";
    private final SesionExamenService sesionExamenService;
    private final EstudianteFotoRepository fotoRepository;

    private final NotificacionService notificacionService;
    /** Máximo del detalle opcional de denegación definido por el cambio upstream D02. */
    public static final int DETALLE_DENEGACION_MAX = 500;
    /** Observaciones opcionales del control (ACCS-02 CA-53/54): de 10 a 100 caracteres. */
    public static final int OBSERVACIONES_MIN = 10;
    public static final int OBSERVACIONES_MAX = 100;
    /** Separa las razones de inhabilitación guardadas en motivo_inhabilitacion. */
    public static final String SEPARADOR_RAZONES = "\n";
    private static final String SEPARADOR_CAUSA = " — ";
    /** Con esta razón el detalle adicional es obligatorio (BUG-D01). */
    private static final String OTRA_RAZON = "Otra razón";
    private final AsistenciaExamenRepository asistenciaRepository;
    private final CatalogoIncidenciaRepository catalogoRepository;
    private final IncidenciaRepository incidenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final RegistroControlIngresoRepository registroRepository;
    private final ObjectMapper objectMapper;
    private final NormasExamenService normasExamenService;

    private final RepartoAulasService repartoAulasService;
    private final ExpulsionRepository expulsionRepository;

    private final TrasladoAmbienteRepository trasladoAmbienteRepository;
    private final AmbienteRepository ambienteRepository;

    @Autowired
    public ControlIngresoService(
            AsistenciaExamenRepository asistenciaRepository,
            CatalogoIncidenciaRepository catalogoRepository,
            IncidenciaRepository incidenciaRepository,
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            RegistroControlIngresoRepository registroRepository,
            ObjectMapper objectMapper,
            RepartoAulasService repartoAulasService,
            NormasExamenService normasExamenService,
            NotificacionService notificacionService, SesionExamenService sesionExamenService,
            ExpulsionRepository expulsionRepository, EstudianteFotoRepository fotoRepository,
            TrasladoAmbienteRepository trasladoAmbienteRepository, // <-- Añadir aquí
            AmbienteRepository ambienteRepository) {
        this.expulsionRepository = expulsionRepository;
        this.fotoRepository = fotoRepository;
        this.sesionExamenService = sesionExamenService;
        this.notificacionService = notificacionService;
        this.asistenciaRepository = asistenciaRepository;
        this.catalogoRepository = catalogoRepository;
        this.incidenciaRepository = incidenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.registroRepository = registroRepository;
        this.objectMapper = objectMapper;
        this.normasExamenService = normasExamenService;
        this.repartoAulasService = repartoAulasService;
        this.trasladoAmbienteRepository = trasladoAmbienteRepository;
        this.ambienteRepository = ambienteRepository;
    }
    // 2. Constructor de compatibilidad (para que los tests antiguos sigan compilando sin tocarlos)
    public ControlIngresoService(
            AsistenciaExamenRepository asistenciaRepository,
            CatalogoIncidenciaRepository catalogoRepository,
            IncidenciaRepository incidenciaRepository,
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            RegistroControlIngresoRepository registroRepository,
            ObjectMapper objectMapper,
            RepartoAulasService repartoAulasService,
            NormasExamenService normasExamenService,
            NotificacionService notificacionService, 
            SesionExamenService sesionExamenService,
            ExpulsionRepository expulsionRepository, 
            EstudianteFotoRepository fotoRepository) {
        this(asistenciaRepository, catalogoRepository, incidenciaRepository, usuarioRepository,
            estudianteRepository, registroRepository, objectMapper, repartoAulasService,
            normasExamenService, notificacionService, sesionExamenService, expulsionRepository,
            fotoRepository, null, null);
    }
    @Transactional
    public ExpulsionResponse expulsar(ExpulsarEstudianteRequest request, Authentication authentication) {
        String email = ExpulsionValidaciones.responsableAutenticado(authentication);
        String motivo = ExpulsionValidaciones.motivo(request.motivo());
        sesionExamenService.bloquearContexto(request.idExamen());
        Usuario admin = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        AsistenciaExamen asistencia = asistenciaRepository.bloquearParaExpulsar(request.idEstudiante(), request.idExamen()).orElse(null);
        ExpulsionValidaciones.asistencia(request, asistencia);
        LocalDateTime cierre = sesionExamenService.ultimoCierre(request.idExamen());
        if (expulsionRepository.expulsadoEnSesionActual(request.idEstudiante(), request.idExamen(), cierre)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "La expulsión del estudiante ya está registrada");
        }
        Expulsion expulsion = new Expulsion();
        expulsion.setIdEstudiante(request.idEstudiante());
        expulsion.setIdExamen(request.idExamen());
        expulsion.setIdUsuarioResponsable(admin.getId());
        expulsion.setMotivo(motivo);
        expulsionRepository.saveAndFlush(expulsion);
        LocalDateTime fechaHora = expulsionRepository.fechaHoraRegistrada(expulsion.getId());
        if (fechaHora == null) throw new IllegalStateException("No se recuperó la hora de la expulsión persistida");
        if (cierre != null && !fechaHora.isAfter(cierre)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "La sesión cambió durante la operación; vuelve a intentarlo");
        }
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, request.idExamen(), request.idEstudiante());
        Estudiante expulsado = asistencia.getEstudiante();
        notificacionService.publicar(Notificacion.EXPULSION,
                "Expulsión: " + expulsado.getNombre() + " " + expulsado.getApellidos(),
                notificacionService.materia(request.idExamen()) + " · " + motivo
                        + " · Registrada por " + admin.getNombre() + " " + admin.getApellidos(),
                request.idExamen(), request.idEstudiante(), enlaceInformacion(request.idExamen()), email);
        return new ExpulsionResponse(expulsion.getId(), request.idEstudiante(), request.idExamen(), motivo,
                admin.getId(), admin.getNombre() + " " + admin.getApellidos(), fechaHora);
    }

    @Transactional
    public AutorizarIngresoResponse autorizar(AutorizarIngresoRequest request, String emailControl) {
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, request.idExamen(), request.idEstudiante());
        validarTextoLibre(request.observaciones());
        validarObservaciones(request.observaciones());
        Usuario control = usuarioRepository.findByEmail(emailControl)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));

        AsistenciaExamen asistencia = asistenciaRepository
                .buscarParaAutorizar(request.idEstudiante(), request.idExamen())
                .orElseThrow(() -> new ControlIngresoException(
                        HttpStatus.NOT_FOUND,
                        "El estudiante no está asociado al examen seleccionado"));
        verificarIngresoAbierto(asistencia);

        String justificacionManual = null;
        if (request.ingresoManual()) {
            justificacionManual = JustificacionManual.validarYNormalizar(request.justificacionManual());
        }


        if (!Boolean.TRUE.equals(asistencia.getHabilitado())) {
            LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
            String motivo = asistencia.getMotivoInhabilitacion();
            String causa = asistencia.getHabilitado() == null
                    ? "El estudiante está pendiente de habilitación para este examen"
                    : motivo == null || motivo.isBlank()
                            ? "El estudiante no está habilitado para este examen"
                            : "El estudiante no está habilitado: " + String.join("; ", razones(motivo));
            registrarIncidencias(asistencia, control, request.incidencias(), ahora);
            guardarRegistro(asistencia, control, request, "DENEGADO", causa);
            return crearRespuesta(asistencia, control, request, false, "DENEGADO_NO_HABILITADO", causa, ahora,
                    request.incidencias().size());
        }
        if (asistencia.getFechaHoraIngreso() != null) {
            LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
            String causa = "El ingreso de este estudiante al examen ya fue autorizado";
            registrarIncidencias(asistencia, control, request.incidencias(), ahora);
            guardarRegistro(asistencia, control, request, "DENEGADO", causa);
            return crearRespuesta(asistencia, control, request, false, "DENEGADO_DUPLICADO", causa, ahora,
                    request.incidencias().size());
        }

        // La foto es obligatoria: sin ella no se puede verificar la identidad (también en el ingreso manual).
        if (!fotoRepository.existsById(request.idEstudiante())) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, SIN_FOTO);
        }

        if (!request.identidadVerificada()) {
            throw new ControlIngresoException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Confirma la verificación de identidad antes de autorizar");
        }

        RepartoAulasService.Aula aula = aulaDelEstudiante(asistencia);
        Integer idAula = aula.idAmbiente();
        int actualizados;
        if (request.ingresoManual() || request.fechaHoraDispositivo() == null || request.fechaHoraDispositivo().isBlank()) {
            // Compatibilidad para clientes abiertos antes de esta mejora.
            actualizados = asistenciaRepository.autorizarConFechaServidor(request.idEstudiante(), request.idExamen(), idAula,
                    control.getId(), limpiar(request.observaciones()));
        } else {
            LocalDateTime horaDispositivo = horaDispositivo(request.fechaHoraDispositivo());
            actualizados = asistenciaRepository.autorizarConHoraDispositivo(request.idEstudiante(), request.idExamen(), idAula,
                    control.getId(), limpiar(request.observaciones()), horaDispositivo);
        }
        if (actualizados != 1) {
            LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
            String causa = "El ingreso de este estudiante al examen ya fue autorizado";
            registrarIncidencias(asistencia, control, request.incidencias(), ahora);
            guardarRegistro(asistencia, control, request, "DENEGADO", causa);
            return crearRespuesta(asistencia, control, request, false, "DENEGADO_DUPLICADO", causa, ahora,
                    request.incidencias().size());
        }
        LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraIngreso(request.idEstudiante(), request.idExamen());
        asistencia.setFechaHoraIngreso(ahora);
        asistencia.setIdAmbienteIngreso(idAula);
        asistencia.setIdUsuarioControl(control.getId());
        asistencia.setObservacionesControl(limpiar(request.observaciones()));

        registrarIncidencias(asistencia, control, request.incidencias(), ahora);

        if (request.ingresoManual() || request.fechaHoraDispositivo() == null || request.fechaHoraDispositivo().isBlank()) {
            guardarRegistro(asistencia, control, request, "AUTORIZADO", null);
        } else {
            guardarRegistro(asistencia, control, request, "AUTORIZADO", null, limpiar(request.observaciones()), ahora);
        }

        if (request.ingresoManual()) {
            registroRepository.marcarIngresoManual(request.idEstudiante(), request.idExamen(), justificacionManual);
            Estudiante estudiante = asistencia.getEstudiante();
            notificacionService.publicar(Notificacion.INGRESO_MANUAL,
                    "Ingreso manual: " + estudiante.getNombre() + " " + estudiante.getApellidos(),
                    notificacionService.materia(request.idExamen()) + " · " + justificacionManual
                            + " · Autorizado por " + control.getNombre() + " " + control.getApellidos(),
                    request.idExamen(), request.idEstudiante(), enlaceInformacion(request.idExamen()), control.getEmail());
        }

        return crearRespuesta(asistencia, control, request, true, "AUTORIZADO", null, ahora, request.incidencias().size(),
                aula.nombre());
    }

    /**
     * La hora que se presenta al personal es la del dispositivo que escanea. Se conserva el offset
     * en la petición para no reinterpretar una hora UTC como si fuera local. Si un cliente antiguo
     * no la envía, se mantiene el comportamiento anterior para no romper controles en curso.
     */
    private LocalDateTime horaDispositivo(String valor) {
        if (valor == null || valor.isBlank()) return asistenciaRepository.obtenerFechaHoraServidor();
        try {
            LocalDateTime hora = OffsetDateTime.parse(valor).toLocalDateTime();
            LocalDateTime servidor = asistenciaRepository.obtenerFechaHoraServidor();
            if (hora.isBefore(servidor.minusHours(24)) || hora.isAfter(servidor.plusHours(24))) {
                throw new ControlIngresoException(HttpStatus.BAD_REQUEST,
                        "La hora del dispositivo difiere demasiado de la hora actual. Corrige la fecha y hora del dispositivo.");
            }
            return hora;
        } catch (DateTimeParseException e) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "La hora del dispositivo no es válida.");
        }
    }

    /**
     * Aula del estudiante al autorizar su ingreso. ALFABETICO: la que le toca por apellidos; si no
     * entra en ninguna, la principal para no perder el ingreso. LLEGADA: la primera aula con lugar;
     * si todas están llenas, no se autoriza hasta que se agregue otra aula.
     */
    private RepartoAulasService.Aula aulaDelEstudiante(AsistenciaExamen asistencia) {
        Examen examen = asistencia.getExamen();
        Integer idExamen = asistencia.getId().getIdExamen();
        if (examen.repartePorLlegada()) {
            repartoAulasService.bloquearExamen(idExamen);
        }
        RepartoAulasService.Reparto reparto = repartoAulasService.repartir(examen,
                asistenciaRepository.listarDelExamen(idExamen, asistencia.getIdParalelo()));
        if (reparto.porLlegada()) {
            RepartoAulasService.Aula aula = RepartoAulasService.aulaParaLlegada(reparto);
            if (aula == null) {
                throw new ControlIngresoException(HttpStatus.CONFLICT,
                        "Todas las aulas del examen están llenas. Pide que agreguen otra aula al examen.");
            }
            return aula;
        }
        RepartoAulasService.Aula aula = reparto.aulaDe(asistencia.getId().getIdEstudiante());
        if (aula != null) {
            return aula;
        }
        String nombre = examen.getAmbiente() != null ? examen.getAmbiente().getNombre() : null;
        return new RepartoAulasService.Aula(examen.getIdAmbiente(), nombre, null, 0);
    }

    /**
     * Un examen cancelado o ya terminado no admite más ingresos (ni autorizar ni denegar). Los
     * reportes de incidentes (intentos, aula incorrecta, QR duplicado, foto) siguen permitidos.
     */
    private void verificarIngresoAbierto(AsistenciaExamen asistencia) {
        LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
        String estado = EstadoExamen.de(asistencia.getExamen(), ahora);
        if (EstadoExamen.CANCELADO.equals(estado)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "El examen fue cancelado; no se pueden registrar ingresos.");
        }
        if (EstadoExamen.FINALIZADO.equals(estado)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "El examen ya terminó; no se pueden registrar ingresos. Los reportes de incidentes siguen disponibles.");
        }
        // No se puede registrar el ingreso días antes: el control abre poco antes del inicio.
        LocalDateTime apertura = EstadoExamen.aperturaControl(asistencia.getExamen());
        if (apertura != null && ahora.isBefore(apertura)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, String.format(
                    "El control de ingreso de este examen se habilita el %s a las %s, %d minutos antes del inicio.",
                    apertura.toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                    apertura.toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")),
                    EstadoExamen.MINUTOS_APERTURA_CONTROL));
        }
    }

    @Transactional
    public AutorizarIngresoResponse denegar(AutorizarIngresoRequest request, String emailControl) {
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, request.idExamen(), request.idEstudiante());
        validarTextoLibre(request.observaciones());
        String razon = limpiar(request.observaciones());
        if (razon == null) throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Indique el motivo de denegación");
        // Al denegar llega "razón — observaciones": solo las observaciones tienen límite de longitud.
        int finRazon = razon.indexOf(SEPARADOR_CAUSA);
        if (finRazon >= 0) {
            validarObservaciones(razon.substring(finRazon + SEPARADOR_CAUSA.length()));
        }
        String detalle = ValidacionTextoLibre.validarOpcional(
                request.detalleDenegacion(), "El detalle adicional", 1, DETALLE_DENEGACION_MAX);
        if (detalle == null && razon.startsWith(OTRA_RAZON)) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Especifique la razón de la denegación");
        }
        String causa = causaDenegacion(razon, detalle);
        Usuario control = usuarioRepository.findByEmail(emailControl)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        AsistenciaExamen asistencia = asistenciaRepository.buscarParaAutorizar(request.idEstudiante(), request.idExamen())
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "El estudiante no está asociado al examen seleccionado"));
        verificarIngresoAbierto(asistencia);
        if (asistencia.getFechaHoraIngreso() != null) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "No se puede denegar un ingreso que ya fue autorizado");
        }
        LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
        asistencia.setHabilitado(false);
        asistencia.setMotivoInhabilitacion(agregarRazon(
                asistencia.getMotivoInhabilitacion(), "Ingreso denegado por CONTROL: " + causa));
        asistenciaRepository.save(asistencia);
        registrarIncidencias(asistencia, control, request.incidencias(), ahora);
        guardarRegistro(asistencia, control, request, "DENEGADO", causa, causa);
        return crearRespuesta(asistencia, control, request, false, "DENEGADO_CONTROL", causa, ahora, request.incidencias().size());
    }

    /** Inserta el detalle tras la razón y conserva cualquier observación adicional posterior. */
    private static String causaDenegacion(String observaciones, String detalle) {
        if (detalle == null) return observaciones;
        int finRazon = observaciones.indexOf(SEPARADOR_CAUSA);
        if (finRazon < 0) return observaciones + SEPARADOR_CAUSA + detalle;
        return observaciones.substring(0, finRazon) + SEPARADOR_CAUSA + detalle + observaciones.substring(finRazon);
    }

    private void registrarIncidencias(
            AsistenciaExamen asistencia,
            Usuario control,
            List<IncidenciaIngresoRequest> incidencias,
            LocalDateTime ahora) {
        for (IncidenciaIngresoRequest item : incidencias) {
            CatalogoIncidencia tipo = catalogoRepository.findById(item.idTipoIncidencia())
                    .orElseThrow(() -> new ControlIngresoException(
                            HttpStatus.BAD_REQUEST,
                            "El tipo de incidencia " + item.idTipoIncidencia() + " no existe"));
            registrarIncidencia(asistencia, control, tipo, item, ahora);
        }
    }

    @Transactional(readOnly = true)
    public ContextoControlIngresoResponse consultarContexto(Integer idEstudiante, Integer idExamen) {
        AsistenciaExamen asistencia = asistenciaRepository.buscarContexto(idEstudiante, idExamen)
                .orElseThrow(() -> new ControlIngresoException(
                        HttpStatus.NOT_FOUND,
                        "El estudiante no está asociado al examen seleccionado"));
        var examen = asistencia.getExamen();
        var estudiante = asistencia.getEstudiante();
        String nombreCompleto = (estudiante.getNombre() + " " + estudiante.getApellidos()).trim();
        NormasExamenService.NormasDeEstudiante normas = normasExamenService.leerParaEstudiante(
                idExamen, estudiante.getId(), nombreCompleto);
        var fila = estudianteRepository.identificarPorCodigoSis(estudiante.getCodigoSis(), idExamen);
        return new ContextoControlIngresoResponse(
                idEstudiante,
                nombreCompleto,
                estudiante.getCodigoSis(),
                estudiante.getCi(),
                idExamen,
                examen.getParalelo().getMateria().getSigla() + " - " + examen.getParalelo().getMateria().getNombre(),
                examen.getFecha(),
                examen.getHoraInicio(),
                examen.getDuracionMinutos(),
                examen.getAmbiente().getNombre(),
                normas.generales(),
                normas.particulares(),
                Boolean.TRUE.equals(asistencia.getHabilitado()),
                asistencia.getMotivoInhabilitacion(),
                asistencia.getFechaHoraIngreso() != null,
                asistencia.getFechaHoraIngreso(),
                fila.map(com.nexacore.examenes.dto.EstudianteExamenFila::carrera).orElse(null),
                estudiante.getCondicion(),
                EstudianteService.fotoUrl(idEstudiante,
                        fila.map(com.nexacore.examenes.dto.EstudianteExamenFila::tieneFoto).orElse(false)));
    }

    @Transactional(readOnly = true)
    public List<TipoIncidenciaResponse> listarTiposIncidencia() {
        return catalogoRepository.findAll().stream()
                .map(tipo -> new TipoIncidenciaResponse(tipo.getId(), tipo.getNombre(), tipo.getDescripcion()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RegistroControlIngresoResponse> consultarHistorial(Integer idEstudiante, Integer idExamen) {
        Map<LocalDateTime, List<IncidenciaRegistradaResponse>> incidencias = incidenciasPorFecha(idEstudiante, idExamen);
        return registroRepository.findByIdIdEstudianteAndIdIdExamenOrderByFechaHoraDesc(idEstudiante, idExamen)
                .stream()
                .map(registro -> {
                    Usuario control = usuarioRepository.findById(registro.getIdUsuarioControl()).orElse(null);
                    String nombre = control == null
                            ? "Usuario de control no disponible"
                            : (control.getNombre() + " " + control.getApellidos()).trim();
                    return new RegistroControlIngresoResponse(
                            registro.getId().getIdControl(), registro.getId().getIdEstudiante(), registro.getId().getIdExamen(),
                            registro.getResultadoAutorizacion(), registro.getMotivoDenegacion(), registro.getObservaciones(),
                            leerVerificaciones(registro.getVerificacionesAdicionales()), nombre, registro.getFechaHora(),
                            registro.getFechaHora() == null
                                    ? List.of()
                                    : incidencias.getOrDefault(alMicrosegundo(registro.getFechaHora()), List.of()));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RegistroControlIngresoExamenResponse> consultarRegistrosExamen(Integer idExamen) {
        // Solo la sesión actual: si el examen se reprogramó, lo anterior está en el historial de sesiones.
        java.time.LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        LocalDateTime desde = cierre == null
                ? TrasladoAmbienteRepository.DESDE_SIEMPRE
                : cierre;

        // Traslados de la sesión actual, por estudiante (el último vale como el aula actual).
        // Nota: trasladoAmbienteRepository puede ser null si se usa el constructor de compatibilidad
        // de tests antiguos; en ese caso no hay historial de traslados que consultar.
        Map<Integer, TrasladoAmbiente> trasladosPorEstudiante = new HashMap<>();
        if (trasladoAmbienteRepository != null) {
            for (TrasladoAmbiente t : trasladoAmbienteRepository
                    .findByIdExamenAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(idExamen, desde)) {
                // El primero (orden ascendente) tiene el aula original: "trasladado desde ...".
                trasladosPorEstudiante.putIfAbsent(t.getIdEstudiante(), t);
            }
        }

        return registroRepository.listarPorExamen(idExamen).stream()
                .filter(registro -> cierre == null || registro.getFechaHora() == null || registro.getFechaHora().isAfter(cierre))
                .map(registro -> {
                    var estudiante = registro.getEstudiante();
                    var control = registro.getUsuarioControl();

                    // Aula donde está el estudiante ahora (puede haber cambiado por reasignación).
                    String ambienteNombre = null;
                    Boolean reasignado = false;
                    String trasladadoDesde = null;
                    AsistenciaExamenId asistenciaId = new AsistenciaExamenId();
                    asistenciaId.setIdEstudiante(registro.getId().getIdEstudiante());
                    asistenciaId.setIdExamen(idExamen);
                    var asistencia = asistenciaRepository.findById(asistenciaId).orElse(null);
                    if (asistencia != null && asistencia.getIdAmbienteIngreso() != null && ambienteRepository != null) {
                        var ambiente = ambienteRepository.findById(asistencia.getIdAmbienteIngreso());
                        ambienteNombre = ambiente.map(Ambiente::getNombre).orElse(null);
                        reasignado = trasladosPorEstudiante.containsKey(registro.getId().getIdEstudiante());
                        if (reasignado) {
                            trasladadoDesde = ambienteRepository
                                    .findById(trasladosPorEstudiante.get(registro.getId().getIdEstudiante()).getIdAmbienteOrigen())
                                    .map(Ambiente::getNombre).orElse(null);
                        }
                    }

                    return new RegistroControlIngresoExamenResponse(
                            registro.getId().getIdControl(),
                            registro.getId().getIdEstudiante(),
                            (estudiante.getNombre() + " " + estudiante.getApellidos()).trim(),
                            estudiante.getCodigoSis(),
                            registro.getResultadoAutorizacion(),
                            registro.getMotivoDenegacion(),
                            registro.getObservaciones(),
                            leerVerificaciones(registro.getVerificacionesAdicionales()),
                            (control.getNombre() + " " + control.getApellidos()).trim(),
                            registro.getFechaHora(), registro.getTipoIngreso(), registro.getJustificacionManual(),
                            ambienteNombre, reasignado, trasladadoDesde);
                })
                .toList();
    }

    private AutorizarIngresoResponse crearRespuesta(
            AsistenciaExamen asistencia,
            Usuario control,
            AutorizarIngresoRequest request,
            boolean autorizado,
            String resultado,
            String causa,
            LocalDateTime ahora,
            int incidenciasRegistradas) {
        return crearRespuesta(asistencia, control, request, autorizado, resultado, causa, ahora,
                incidenciasRegistradas, null);
    }

    /** aula: la asignada al autorizar; null en las denegaciones (se informa el aula principal). */
    private AutorizarIngresoResponse crearRespuesta(
            AsistenciaExamen asistencia,
            Usuario control,
            AutorizarIngresoRequest request,
            boolean autorizado,
            String resultado,
            String causa,
            LocalDateTime ahora,
            int incidenciasRegistradas,
            String aula) {
        List<String> verificaciones = request.verificacionesAdicionales().stream()
                .map(ControlIngresoService::limpiar)
                .filter(valor -> valor != null && !valor.isBlank())
                .toList();

        var examen = asistencia.getExamen();
        var estudiante = asistencia.getEstudiante();
        return new AutorizarIngresoResponse(
                autorizado,
                resultado,
                causa,
                request.idEstudiante(),
                request.idExamen(),
                (estudiante.getNombre() + " " + estudiante.getApellidos()).trim(),
                estudiante.getCodigoSis(),
                examen.getParalelo().getMateria().getSigla() + " - " + examen.getParalelo().getMateria().getNombre(),
                aula != null ? aula : examen.getAmbiente().getNombre(),
                normasExamenService.resumen(request.idExamen()),
                (control.getNombre() + " " + control.getApellidos()).trim(),
                ahora,
                asistencia.getObservacionesControl(),
                verificaciones,
                incidenciasRegistradas);
    }

    private void guardarRegistro(
            AsistenciaExamen asistencia,
            Usuario control,
            AutorizarIngresoRequest request,
            String resultado,
            String causa) {
        guardarRegistro(asistencia, control, request, resultado, causa, limpiar(request.observaciones()));
    }

    /** En denegaciones el campo observaciones conserva el texto completo de la causa para auditoría. */
    private void guardarRegistro(
            AsistenciaExamen asistencia,
            Usuario control,
            AutorizarIngresoRequest request,
            String resultado,
            String causa,
            String observaciones) {
        registroRepository.registrar(
                asistencia.getId().getIdExamen(), asistencia.getIdParalelo(),
                asistencia.getId().getIdEstudiante(), control.getId(),
                resultado, causa, serializarVerificaciones(request.verificacionesAdicionales()),
                observaciones);
    }

    private void guardarRegistro(
            AsistenciaExamen asistencia,
            Usuario control,
            AutorizarIngresoRequest request,
            String resultado,
            String causa,
            String observaciones,
            LocalDateTime fechaHora) {
        registroRepository.registrarConFecha(
                asistencia.getId().getIdExamen(), asistencia.getIdParalelo(),
                asistencia.getId().getIdEstudiante(), control.getId(),
                resultado, causa, serializarVerificaciones(request.verificacionesAdicionales()),
                observaciones, fechaHora);
    }

    private String serializarVerificaciones(List<String> valores) {
        List<String> limpias = valores.stream().map(ControlIngresoService::limpiar)
                .filter(valor -> valor != null && !valor.isBlank()).toList();
        try {
            return objectMapper.writeValueAsString(limpias);
        } catch (JsonProcessingException e) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Las verificaciones no tienen un formato válido");
        }
    }

    private List<String> leerVerificaciones(String valor) {
        if (valor == null || valor.isBlank()) return List.of();
        try {
            return objectMapper.readValue(valor, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private void registrarIncidencia(
            AsistenciaExamen asistencia,
            Usuario control,
            CatalogoIncidencia tipo,
            IncidenciaIngresoRequest item,
            LocalDateTime ahora) {
        incidenciaRepository.registrar(
                asistencia.getId().getIdExamen(),
                asistencia.getId().getIdEstudiante(),
                control.getId(),
                tipo.getId(),
                asistencia.getIdParalelo(),
                limpiar(item.descripcion()),
                ahora);
    }

    /**
     * Incidencias agrupadas por fecha y hora: cada una se registra en la misma transacción que su
     * control, con la hora del servidor, así que coincide con la fecha_hora de ese registro.
     */
    private Map<LocalDateTime, List<IncidenciaRegistradaResponse>> incidenciasPorFecha(
            Integer idEstudiante, Integer idExamen) {
        Map<LocalDateTime, List<IncidenciaRegistradaResponse>> porFecha = new HashMap<>();
        for (Object[] fila : incidenciaRepository.listarDelControl(idEstudiante, idExamen)) {
            LocalDateTime fecha = aLocalDateTime(fila[0]);
            if (fecha == null) continue;
            porFecha.computeIfAbsent(alMicrosegundo(fecha), f -> new ArrayList<>())
                    .add(new IncidenciaRegistradaResponse((String) fila[1], (String) fila[2]));
        }
        return porFecha;
    }

    private static LocalDateTime aLocalDateTime(Object valor) {
        if (valor instanceof LocalDateTime fecha) return fecha;
        if (valor instanceof Timestamp fecha) return fecha.toLocalDateTime();
        if (valor instanceof Instant fecha) return LocalDateTime.ofInstant(fecha, ZoneId.systemDefault());
        return null;
    }

    /** PostgreSQL guarda microsegundos: así se comparan igual las dos columnas. */
    private static LocalDateTime alMicrosegundo(LocalDateTime fecha) {
        return fecha.truncatedTo(ChronoUnit.MICROS);
    }

    /** Las razones de inhabilitación registradas, una por línea. */
    public static List<String> razones(String motivo) {
        if (motivo == null) return List.of();
        return motivo.lines().map(String::strip).filter(r -> !r.isEmpty()).toList();
    }

    /** Agrega la razón sin perder las anteriores (p. ej. la que registró el administrador). */
    private static String agregarRazon(String motivoAnterior, String razon) {
        List<String> previas = razones(motivoAnterior);
        if (previas.contains(razon)) return String.join(SEPARADOR_RAZONES, previas);
        List<String> todas = new ArrayList<>(previas);
        todas.add(razon);
        return String.join(SEPARADOR_RAZONES, todas);
    }

    /** Observaciones opcionales: si se escriben, de 10 a 100 caracteres válidos. */
    private static void validarObservaciones(String observaciones) {
        ValidacionTextoLibre.validarOpcional(
                observaciones, "La observación", OBSERVACIONES_MIN, OBSERVACIONES_MAX);
    }

    /** Donde se revisan los incidentes del examen (Información de ingreso). */
    private static String enlaceInformacion(Integer idExamen) {
        return "/dashboard/control/" + idExamen + "/informacion";
    }

    private static String limpiar(String valor) {
        if (valor == null) return null;
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    /** Impide guardar garabatos en la evidencia de control aunque el cliente sea omitido. */
    private static void validarTextoLibre(String valor) {
        String texto = limpiar(valor);
        if (texto == null) return;
        String garabato = ValidacionPalabras.primerGarabato(texto);
        if (garabato != null) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST,
                    "El texto contiene contenido no válido: " + garabato);
        }
    }
    @Transactional
    public ReasignarAmbienteResponse reasignarAmbiente(
            Integer idExamen, 
            Integer idEstudiante, 
            ReasignarAmbienteRequest request, 
            String emailControl) {
        
        // 6. Usar el bloqueo de concurrencia de Marcelo al inicio
        sesionExamenService.bloquearContexto(idExamen);

        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, idExamen, idEstudiante);
        validarTextoLibre(request.motivo());
        validarTextoLibre(request.observacion());

        Usuario control = usuarioRepository.findByEmail(emailControl)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));

        AsistenciaExamen asistencia = asistenciaRepository
                .buscarContexto(idEstudiante, idExamen)
                .orElseThrow(() -> new ControlIngresoException(
                        HttpStatus.NOT_FOUND,
                        "El estudiante no está asociado al examen seleccionado"));
        
        verificarIngresoAbierto(asistencia);

        // 4. Tampoco trasladar a un estudiante expulsado
        LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        if (expulsionRepository.expulsadoEnSesionActual(idEstudiante, idExamen, cierre)) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "No se puede reasignar a un estudiante expulsado");
        }

        // 2. Solo reasignar a quien ya ingresó (Debe responder 409 con el mensaje exacto)
        if (asistencia.getFechaHoraIngreso() == null) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "El estudiante aún no ingresó");
        }

        Integer ambienteOrigenId = asistencia.getIdAmbienteIngreso();

        // 4. Validar el aula destino: que sea distinta de la actual
        if (ambienteOrigenId != null && ambienteOrigenId.equals(request.idAmbienteDestino())) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "El aula destino debe ser distinta a la actual");
        }

        // 4 y 7. Validar que el aula destino exista y obtener los nombres reales de las aulas
        var ambienteOrigen = ambienteOrigenId != null ? ambienteRepository.findById(ambienteOrigenId).orElse(null) : null;
        var ambienteDestino = ambienteRepository.findById(request.idAmbienteDestino())
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "El aula destino no existe"));

        String aulaOrigenNombre = ambienteOrigen != null ? ambienteOrigen.getNombre() : "Aula anterior";
        String aulaDestinoNombre = ambienteDestino.getNombre();

        // 5. No borrar la observación del control: se mantiene intacta.
        // El motivo y observaciones del traslado van exclusivamente a la tabla traslado_ambiente.

        // Actualizar únicamente el ambiente destino conservando la fecha de ingreso original intacta
        asistencia.setIdAmbienteIngreso(request.idAmbienteDestino());
        asistenciaRepository.save(asistencia);

       // 1 y 3. Guardar el traslado en la tabla traslado_ambiente (V44) sin duplicar registros de control
TrasladoAmbiente traslado = new TrasladoAmbiente();
traslado.setIdEstudiante(idEstudiante);
traslado.setIdExamen(idExamen);
traslado.setIdAmbienteOrigen(ambienteOrigenId);
traslado.setIdAmbienteDestino(request.idAmbienteDestino()); 
traslado.setMotivo(limpiar(request.motivo()));
traslado.setObservacion(limpiar(request.observacion()));               
traslado.setIdUsuarioAdmin(control.getId());
traslado.setFechaHoraTraslado(asistenciaRepository.obtenerFechaHoraServidor());
trasladoAmbienteRepository.save(traslado);
        Estudiante trasladado = asistencia.getEstudiante();
        notificacionService.publicar(Notificacion.TRASLADO_AMBIENTE,
                "Traslado: " + trasladado.getNombre() + " " + trasladado.getApellidos(),
                notificacionService.materia(idExamen) + " · De " + aulaOrigenNombre + " a " + aulaDestinoNombre
                        + " · " + traslado.getMotivo() + " · Registrado por " + control.getNombre() + " " + control.getApellidos(),
                idExamen, idEstudiante, enlaceInformacion(idExamen), emailControl);
        
        return new ReasignarAmbienteResponse(
                idEstudiante,
                idExamen,
                ambienteOrigenId,
                aulaOrigenNombre,
                request.idAmbienteDestino(),
                aulaDestinoNombre,
                asistencia.getFechaHoraIngreso(), // La fecha original no cambia
                limpiar(request.observacion()),
                true
        );
    }
}