package com.nexacore.examenes.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.dto.AutorizarIngresoResponse;
import com.nexacore.examenes.dto.IncidenciaIngresoRequest;
import com.nexacore.examenes.dto.RegistroControlIngresoResponse;
import com.nexacore.examenes.dto.TipoIncidenciaResponse;
import com.nexacore.examenes.dto.ContextoControlIngresoResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.CatalogoIncidencia;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.CatalogoIncidenciaRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.IncidenciaRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.RegistroControlIngresoRepository;
import com.nexacore.examenes.utils.ValidacionTextoLibre;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@Service
public class ControlIngresoService {
    /** Máximo del "Detalle adicional" al denegar (BUG-D02). */
    public static final int DETALLE_DENEGACION_MAX = 500;
    private static final String SEPARADOR_CAUSA = " — ";

    private final AsistenciaExamenRepository asistenciaRepository;
    private final CatalogoIncidenciaRepository catalogoRepository;
    private final IncidenciaRepository incidenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final RegistroControlIngresoRepository registroRepository;
    private final ObjectMapper objectMapper;

    private final RepartoAulasService repartoAulasService;

    public ControlIngresoService(
            AsistenciaExamenRepository asistenciaRepository,
            CatalogoIncidenciaRepository catalogoRepository,
            IncidenciaRepository incidenciaRepository,
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            RegistroControlIngresoRepository registroRepository,
            ObjectMapper objectMapper,
            RepartoAulasService repartoAulasService) {
        this.asistenciaRepository = asistenciaRepository;
        this.catalogoRepository = catalogoRepository;
        this.incidenciaRepository = incidenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.registroRepository = registroRepository;
        this.objectMapper = objectMapper;
        this.repartoAulasService = repartoAulasService;
    }

    @Transactional
    public AutorizarIngresoResponse autorizar(AutorizarIngresoRequest request, String emailControl) {
        Usuario control = usuarioRepository.findByEmail(emailControl)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));

        AsistenciaExamen asistencia = asistenciaRepository
                .buscarParaAutorizar(request.idEstudiante(), request.idExamen())
                .orElseThrow(() -> new ControlIngresoException(
                        HttpStatus.NOT_FOUND,
                        "El estudiante no está asociado al examen seleccionado"));

        if (!Boolean.TRUE.equals(asistencia.getHabilitado())) {
            LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
            String motivo = asistencia.getMotivoInhabilitacion();
            String causa = asistencia.getHabilitado() == null
                    ? "El estudiante está pendiente de habilitación para este examen"
                    : motivo == null || motivo.isBlank()
                            ? "El estudiante no está habilitado para este examen"
                            : "El estudiante no está habilitado: " + motivo;
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

        if (!request.identidadVerificada()) {
            throw new ControlIngresoException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Confirma la verificación de identidad antes de autorizar");
        }

        RepartoAulasService.Aula aula = aulaDelEstudiante(asistencia);
        Integer idAula = aula.idAmbiente();
        int actualizados = asistenciaRepository.autorizarConFechaServidor(
                request.idEstudiante(), request.idExamen(), idAula,
                control.getId(), limpiar(request.observaciones()));
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

        guardarRegistro(asistencia, control, request, "AUTORIZADO", null);

        return crearRespuesta(asistencia, control, request, true, "AUTORIZADO", null, ahora, request.incidencias().size(),
                aula.nombre());
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

    @Transactional
    public AutorizarIngresoResponse denegar(AutorizarIngresoRequest request, String emailControl) {
        String razon = limpiar(request.observaciones());
        if (razon == null) throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Indique el motivo de denegación");
        String detalle = ValidacionTextoLibre.validarOpcional(
                request.detalleDenegacion(), "El detalle adicional", 1, DETALLE_DENEGACION_MAX);
        String causa = causaDenegacion(razon, detalle);
        Usuario control = usuarioRepository.findByEmail(emailControl)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        AsistenciaExamen asistencia = asistenciaRepository.buscarParaAutorizar(request.idEstudiante(), request.idExamen())
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "El estudiante no está asociado al examen seleccionado"));
        if (asistencia.getFechaHoraIngreso() != null) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "No se puede denegar un ingreso que ya fue autorizado");
        }
        LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
        asistencia.setHabilitado(false);
        asistencia.setMotivoInhabilitacion("Ingreso denegado por CONTROL: " + causa);
        asistenciaRepository.save(asistencia);
        registrarIncidencias(asistencia, control, request.incidencias(), ahora);
        guardarRegistro(asistencia, control, request, "DENEGADO", causa, causa);
        return crearRespuesta(asistencia, control, request, false, "DENEGADO_CONTROL", causa, ahora, request.incidencias().size());
    }

    /**
     * Texto de la denegación en el orden de siempre: razón — detalle — observaciones (BUG-D02).
     * Al denegar, observaciones llega como "razón" o "razón — observaciones"; el detalle va tras la razón.
     */
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
        NormasExamen normas = leerNormas(examen.getNormas(), nombreCompleto);
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
                estudianteRepository.identificarPorCodigoSis(estudiante.getCodigoSis(), idExamen)
                        .map(com.nexacore.examenes.dto.EstudianteExamenFila::carrera).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<TipoIncidenciaResponse> listarTiposIncidencia() {
        return catalogoRepository.findAll().stream()
                .map(tipo -> new TipoIncidenciaResponse(tipo.getId(), tipo.getNombre(), tipo.getDescripcion()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RegistroControlIngresoResponse> consultarHistorial(Integer idEstudiante, Integer idExamen) {
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
                            leerVerificaciones(registro.getVerificacionesAdicionales()), nombre, registro.getFechaHora());
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
                examen.getNormas(),
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

    /** observaciones: al denegar, el texto completo (razón — detalle — observaciones), como antes del BUG-D02. */
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

    private NormasExamen leerNormas(String valor, String estudiante) {
        if (valor == null || valor.isBlank()) return new NormasExamen(List.of(), List.of());
        try {
            Map<String, Object> contenido = objectMapper.readValue(valor, new TypeReference<>() {});
            List<String> generales = objectMapper.convertValue(
                    contenido.getOrDefault("generales", List.of()), new TypeReference<>() {});
            List<Map<String, Object>> particulares = objectMapper.convertValue(
                    contenido.getOrDefault("particulares", List.of()), new TypeReference<>() {});
            List<String> aplicables = particulares.stream()
                    .filter(norma -> estudiante.equalsIgnoreCase(String.valueOf(norma.get("estudiante"))))
                    .map(norma -> String.valueOf(norma.get("texto")))
                    .filter(texto -> !texto.isBlank() && !"null".equals(texto))
                    .toList();
            return new NormasExamen(generales, aplicables);
        } catch (IllegalArgumentException | JsonProcessingException e) {
            return new NormasExamen(List.of(valor), List.of());
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

    private static String limpiar(String valor) {
        if (valor == null) return null;
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    private record NormasExamen(List<String> generales, List<String> particulares) {}
}
