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
import com.nexacore.examenes.models.CatalogoIncidencia;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.CatalogoIncidenciaRepository;
import com.nexacore.examenes.repositories.IncidenciaRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.RegistroControlIngresoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@Service
public class ControlIngresoService {
    private final AsistenciaExamenRepository asistenciaRepository;
    private final CatalogoIncidenciaRepository catalogoRepository;
    private final IncidenciaRepository incidenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RegistroControlIngresoRepository registroRepository;
    private final ObjectMapper objectMapper;

    public ControlIngresoService(
            AsistenciaExamenRepository asistenciaRepository,
            CatalogoIncidenciaRepository catalogoRepository,
            IncidenciaRepository incidenciaRepository,
            UsuarioRepository usuarioRepository,
            RegistroControlIngresoRepository registroRepository,
            ObjectMapper objectMapper) {
        this.asistenciaRepository = asistenciaRepository;
        this.catalogoRepository = catalogoRepository;
        this.incidenciaRepository = incidenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.registroRepository = registroRepository;
        this.objectMapper = objectMapper;
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
            String causa = motivo == null || motivo.isBlank()
                    ? "El estudiante no está habilitado para este examen"
                    : "El estudiante no está habilitado: " + motivo;
            registrarIncidencias(asistencia, control, request.incidencias(), ahora);
            guardarRegistro(asistencia, control, request, "DENEGADO", causa);
            return crearRespuesta(asistencia, control, request, false, "DENEGADO_NO_HABILITADO", causa, ahora, 0);
        }
        if (asistencia.getFechaHoraIngreso() != null) {
            LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
            String causa = "El ingreso de este estudiante al examen ya fue autorizado";
            registrarIncidencias(asistencia, control, request.incidencias(), ahora);
            guardarRegistro(asistencia, control, request, "DENEGADO", causa);
            return crearRespuesta(asistencia, control, request, false, "DENEGADO_DUPLICADO", causa, ahora, 0);
        }

        int actualizados = asistenciaRepository.autorizarConFechaServidor(
                request.idEstudiante(), request.idExamen(), asistencia.getExamen().getIdAmbiente(),
                control.getId(), limpiar(request.observaciones()));
        if (actualizados != 1) {
            LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
            String causa = "El ingreso de este estudiante al examen ya fue autorizado";
            registrarIncidencias(asistencia, control, request.incidencias(), ahora);
            guardarRegistro(asistencia, control, request, "DENEGADO", causa);
            return crearRespuesta(asistencia, control, request, false, "DENEGADO_DUPLICADO", causa, ahora, 0);
        }
        LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraIngreso(request.idEstudiante(), request.idExamen());
        asistencia.setFechaHoraIngreso(ahora);
        asistencia.setIdAmbienteIngreso(asistencia.getExamen().getIdAmbiente());
        asistencia.setIdUsuarioControl(control.getId());
        asistencia.setObservacionesControl(limpiar(request.observaciones()));

        registrarIncidencias(asistencia, control, request.incidencias(), ahora);

        guardarRegistro(asistencia, control, request, "AUTORIZADO", null);

        return crearRespuesta(asistencia, control, request, true, "AUTORIZADO", null, ahora, request.incidencias().size());
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
        var usuario = estudiante.getIdUsuario();
        NormasExamen normas = leerNormas(examen.getNormas(), (usuario.getNombre() + " " + usuario.getApellidos()).trim());
        return new ContextoControlIngresoResponse(
                idEstudiante,
                (usuario.getNombre() + " " + usuario.getApellidos()).trim(),
                estudiante.getCodigoSis(),
                usuario.getCi(),
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
                asistencia.getFechaHoraIngreso());
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
        List<String> verificaciones = request.verificacionesAdicionales().stream()
                .map(ControlIngresoService::limpiar)
                .filter(valor -> valor != null && !valor.isBlank())
                .toList();

        var examen = asistencia.getExamen();
        var estudiante = asistencia.getEstudiante();
        var usuarioEstudiante = estudiante.getIdUsuario();
        return new AutorizarIngresoResponse(
                autorizado,
                resultado,
                causa,
                request.idEstudiante(),
                request.idExamen(),
                (usuarioEstudiante.getNombre() + " " + usuarioEstudiante.getApellidos()).trim(),
                estudiante.getCodigoSis(),
                examen.getParalelo().getMateria().getSigla() + " - " + examen.getParalelo().getMateria().getNombre(),
                examen.getAmbiente().getNombre(),
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
        registroRepository.registrar(
                asistencia.getId().getIdExamen(), asistencia.getIdParalelo(),
                asistencia.getId().getIdEstudiante(), asistencia.getIdUsuario(), control.getId(),
                resultado, causa, serializarVerificaciones(request.verificacionesAdicionales()),
                limpiar(request.observaciones()));
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
                asistencia.getIdUsuario(),
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
