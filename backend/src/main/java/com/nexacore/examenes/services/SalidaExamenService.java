package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.SalidaResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Salida del estudiante del examen (V56): cuando entrega y se retira, el CONTROL (o el docente) la registra con la
 * hora del servidor. Solo quien ingresó, no fue expulsado y aún no salió.
 */
@Service
public class SalidaExamenService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final NamedParameterJdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final ExpulsionRepository expulsionRepository;
    private final AsistenciaExamenRepository asistenciaRepository;
    private final SesionExamenService sesionExamenService;
    private final NotificacionService notificacionService;

    public SalidaExamenService(NamedParameterJdbcTemplate jdbc, UsuarioRepository usuarioRepository,
                               ExpulsionRepository expulsionRepository, AsistenciaExamenRepository asistenciaRepository,
                               SesionExamenService sesionExamenService, NotificacionService notificacionService) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.expulsionRepository = expulsionRepository;
        this.asistenciaRepository = asistenciaRepository;
        this.sesionExamenService = sesionExamenService;
        this.notificacionService = notificacionService;
    }

    /** Texto que acompaña a la hora de salida calculada al terminar el examen. */
    public static final String AL_CIERRE = " (al cierre)";

    /** Para calcular la salida al cierre; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.nexacore.examenes.repositories.ExamenRepository examenRepository;

    /**
     * Hora de fin del examen si ya terminó (hora del servidor); null si sigue en curso o no existe. Quien ingresó, no
     * fue expulsado y no marcó salida, salió a esta hora («al cierre»): no se graba, se calcula, así sigue siendo
     * correcta aunque cambien la duración o reprogramen el examen.
     */
    @Transactional(readOnly = true)
    public LocalDateTime finSiTermino(Integer idExamen) {
        if (examenRepository == null || idExamen == null) return null;
        return examenRepository.findFirstByIdIdExamen(idExamen)
                .filter(e -> e.getFecha() != null && e.getHoraInicio() != null && e.getDuracionMinutos() != null)
                .map(e -> e.getFecha().atTime(e.getHoraInicio()).plusMinutes(e.getDuracionMinutos()))
                .filter(fin -> !asistenciaRepository.obtenerFechaHoraServidor().isBefore(fin))
                .orElse(null);
    }

    /** Estudiantes con expulsión vigente (no anulada) en la sesión actual: no salen «al cierre». */
    @Transactional(readOnly = true)
    public java.util.Set<Integer> expulsados(Integer idExamen) {
        LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        return new java.util.HashSet<>(jdbc.queryForList(
                "SELECT id_estudiante FROM expulsion WHERE id_examen = :examen AND anulada_en IS NULL AND fecha_hora > :desde",
                new MapSqlParameterSource("examen", idExamen)
                        .addValue("desde", Timestamp.valueOf(cierre == null ? LocalDateTime.of(2000, 1, 1, 0, 0) : cierre)),
                Integer.class));
    }

    @Transactional
    public SalidaResponse registrar(Integer idExamen, Integer idEstudiante, String email) {
        sesionExamenService.bloquearContexto(idExamen);
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        var p = new MapSqlParameterSource("examen", idExamen).addValue("estudiante", idEstudiante);
        var filas = jdbc.queryForList("""
                SELECT fecha_hora_ingreso, fecha_hora_salida FROM asistencia_examen
                WHERE id_examen = :examen AND id_estudiante = :estudiante FOR UPDATE
                """, p);
        if (filas.isEmpty()) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "El estudiante no está asociado a este examen");
        }
        if (filas.get(0).get("fecha_hora_ingreso") == null) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "El estudiante aún no ingresó: no se puede registrar su salida");
        }
        Object salida = filas.get(0).get("fecha_hora_salida");
        if (salida != null) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "La salida ya está registrada a las " + ((Timestamp) salida).toLocalDateTime().format(HORA));
        }
        if (expulsionRepository.expulsadoEnSesionActual(idEstudiante, idExamen, sesionExamenService.ultimoCierre(idExamen))) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "El estudiante fue expulsado: no se registra su salida");
        }
        LocalDateTime ahora = asistenciaRepository.obtenerFechaHoraServidor();
        jdbc.update("""
                UPDATE asistencia_examen SET fecha_hora_salida = :ahora, id_usuario_salida = :usuario
                WHERE id_examen = :examen AND id_estudiante = :estudiante
                """, p.addValue("ahora", Timestamp.valueOf(ahora)).addValue("usuario", usuario.getId()));
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, idExamen, idEstudiante);
        return new SalidaResponse(idEstudiante, idExamen, ahora);
    }
}
