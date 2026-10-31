package com.nexacore.examenes.services;

import com.nexacore.examenes.models.Notificacion;

import com.nexacore.examenes.dto.IntentoIngresoResponse;
import com.nexacore.examenes.dto.RegistrarAmbienteIncorrectoRequest;
import com.nexacore.examenes.dto.RegistrarIntentoIngresoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.IntentoIngresoRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class IntentoIngresoService {
    private final SesionExamenService sesionExamenService;
    private final IntentoIngresoRepository intentoRepository;
    private final EstudianteRepository estudianteRepository;
    private final ExamenRepository examenRepository;
    private final AsistenciaExamenRepository asistenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;

    public IntentoIngresoService(IntentoIngresoRepository intentoRepository, EstudianteRepository estudianteRepository,
                                 ExamenRepository examenRepository, AsistenciaExamenRepository asistenciaRepository,
                                 UsuarioRepository usuarioRepository,
                                 NotificacionService notificacionService, SesionExamenService sesionExamenService) {
        this.sesionExamenService = sesionExamenService;
        this.intentoRepository = intentoRepository;
        this.estudianteRepository = estudianteRepository;
        this.examenRepository = examenRepository;
        this.asistenciaRepository = asistenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.notificacionService = notificacionService;
    }

    @Transactional
    public void registrar(RegistrarIntentoIngresoRequest request, String emailControl) {
        String motivoValidado = com.nexacore.examenes.utils.MotivoIntento.validarYNormalizar(request.motivo());
        if (!examenRepository.existsByIdIdExamen(request.idExamen())) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + request.idExamen());
        }
        estudianteRepository.findById(request.idEstudiante()).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el estudiante indicado"));
        if (asistenciaRepository.buscarContexto(request.idEstudiante(), request.idExamen()).isPresent()) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "El estudiante ya está asociado a este examen; no corresponde registrar un intento incorrecto");
        }
        if (intentoRepository.existeRegistroReciente(request.idExamen(), request.idEstudiante())) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "Este intento ya fue registrado hace unos segundos; no se duplicó el registro");
        }
        var control = usuarioRepository.findByEmail(emailControl).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        int insertados = intentoRepository.registrar(request.idExamen(), request.idEstudiante(), control.getId(),
                request.identificador().trim(), motivoValidado);
        if (insertados != 1) throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen indicado");
        var estudiante = estudianteRepository.findById(request.idEstudiante()).orElseThrow();
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, request.idExamen(), request.idEstudiante());
        notificacionService.publicar(Notificacion.INTENTO_INGRESO,
                "Intento de ingreso incorrecto: " + estudiante.getNombre() + " " + estudiante.getApellidos(),
                notificacionService.materia(request.idExamen()) + " · " + motivoValidado
                        + " · Registrado por " + control.getNombre() + " " + control.getApellidos(),
                request.idExamen(), request.idEstudiante(), enlace(request.idExamen()), emailControl);
    }

    private static String enlace(Integer idExamen) {
        return "/dashboard/control/" + idExamen + "/informacion";
    }

    /**
     * ACCS-06: guarda como intento de ingreso incorrecto que un estudiante del examen se presentó en
     * un aula distinta de la asignada. El aula asignada se toma del examen, no de lo que envía el cliente.
     */
    @Transactional
    public IntentoIngresoResponse registrarAmbienteIncorrecto(RegistrarAmbienteIncorrectoRequest request,
                                                              String emailControl) {
        var asistencia = asistenciaRepository.buscarContexto(request.idEstudiante(), request.idExamen())
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.CONFLICT,
                        "El estudiante no está asociado a este examen; registre un intento de ingreso incorrecto"));
        var examen = asistencia.getExamen();
        String aulaEsperada = examen.getAmbiente() != null ? examen.getAmbiente().getNombre() : null;
        String aulaActual = request.aulaActual().trim().toUpperCase();
        if (!com.nexacore.examenes.utils.ValidacionPalabras.esCodigoDeAmbiente(aulaActual)) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Usa un código de aula válido, por ejemplo 692F, L813 o INFLAB");
        }
        if (aulaEsperada != null && aulaEsperada.trim().equalsIgnoreCase(aulaActual)) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST,
                    "El aula actual es la misma que el aula asignada al examen");
        }
        if (intentoRepository.existeRegistroReciente(request.idExamen(), request.idEstudiante())) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "Este reporte ya fue registrado hace unos segundos; no se duplicó el registro");
        }
        var control = usuarioRepository.findByEmail(emailControl).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        String motivo = "Ambiente incorrecto: se presentó en el aula " + aulaActual
                + (aulaEsperada != null ? "; aula asignada: " + aulaEsperada : "");
        int insertados = intentoRepository.registrar(request.idExamen(), request.idEstudiante(), control.getId(),
                asistencia.getEstudiante().getCodigoSis(), motivo);
        if (insertados != 1) throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen indicado");
        var estudiante = asistencia.getEstudiante();
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, request.idExamen(), request.idEstudiante());
        notificacionService.publicar(Notificacion.AULA_INCORRECTA,
                "Estudiante en aula incorrecta: " + estudiante.getNombre() + " " + estudiante.getApellidos(),
                notificacionService.materia(request.idExamen()) + " · " + motivo
                        + " · Registrado por " + control.getNombre() + " " + control.getApellidos(),
                request.idExamen(), request.idEstudiante(), enlace(request.idExamen()), emailControl);
        // El listado viene ordenado del más reciente al más antiguo: el primero es el que se acaba de guardar.
        return intentoRepository.listar(request.idExamen(), request.idEstudiante()).stream()
                .findFirst().map(this::respuesta)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "No se pudo leer el reporte registrado"));
    }

    @Transactional(readOnly = true)
    public List<IntentoIngresoResponse> listar(Integer idExamen, Integer idEstudiante) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
        java.time.LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        return intentoRepository.listar(idExamen, idEstudiante).stream().map(this::respuesta)
                .filter(i -> cierre == null || i.fechaHora() == null || i.fechaHora().isAfter(cierre))
                .toList();
    }

    private IntentoIngresoResponse respuesta(Object[] fila) {
        return new IntentoIngresoResponse(((Number) fila[0]).intValue(), ((Number) fila[1]).intValue(),
                fila[2] == null ? null : ((Number) fila[2]).intValue(), (String) fila[3], (String) fila[4],
                (String) fila[5], (String) fila[6], (String) fila[7], aFecha(fila[8]));
    }

    private LocalDateTime aFecha(Object valor) {
        if (valor instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
        if (valor instanceof OffsetDateTime offsetDateTime) return offsetDateTime.toLocalDateTime();
        return (LocalDateTime) valor;
    }

    /** Tamaño máximo de página del reporte (el frontend pide de a 20). */
    static final int MAX_TAMANO_REPORTE = 100;

    /**
     * DASH-06 / HU#7: reporte de intentos de ingreso incorrectos para el ADMIN. Sin examen, todos los
     * registrados; con examen, solo los de su sesión actual (si se reprogramó, los anteriores son historial).
     */
    @Transactional(readOnly = true)
    public com.nexacore.examenes.dto.PageResponse<com.nexacore.examenes.dto.IntentoReporteResponse> reporte(
            Integer idExamen, int page, int size) {
        if (page < 0) throw new IllegalArgumentException("La página no puede ser negativa");
        if (size < 1 || size > MAX_TAMANO_REPORTE) {
            throw new IllegalArgumentException("El tamaño de página debe estar entre 1 y " + MAX_TAMANO_REPORTE);
        }
        LocalDateTime desde = null;
        if (idExamen != null) {
            if (!examenRepository.existsByIdIdExamen(idExamen)) {
                throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
            }
            desde = sesionExamenService.ultimoCierre(idExamen);
        }
        var pagina = intentoRepository.reporte(idExamen, desde, org.springframework.data.domain.PageRequest.of(page, size));
        return com.nexacore.examenes.dto.PageResponse.de(pagina.map(this::filaReporte));
    }

    private com.nexacore.examenes.dto.IntentoReporteResponse filaReporte(Object[] f) {
        String motivo = (String) f[9];
        String tipo = motivo != null && motivo.startsWith("Ambiente incorrecto")
                ? com.nexacore.examenes.dto.IntentoReporteResponse.AULA_INCORRECTA
                : com.nexacore.examenes.dto.IntentoReporteResponse.NO_CORRESPONDE;
        String estudiante = (String) f[6];
        return new com.nexacore.examenes.dto.IntentoReporteResponse(
                ((Number) f[0]).intValue(), ((Number) f[1]).intValue(), (String) f[2],
                aFechaExamen(f[3]), aHora(f[4]), f[5] == null ? null : ((Number) f[5]).intValue(),
                estudiante == null || estudiante.isBlank() ? null : estudiante.strip(), (String) f[7], (String) f[8],
                motivo, tipo, (String) f[10], aFecha(f[11]));
    }

    private static java.time.LocalDate aFechaExamen(Object valor) {
        if (valor instanceof java.sql.Date d) return d.toLocalDate();
        return (java.time.LocalDate) valor;
    }

    private static java.time.LocalTime aHora(Object valor) {
        if (valor instanceof java.sql.Time t) return t.toLocalTime();
        return (java.time.LocalTime) valor;
    }
}
