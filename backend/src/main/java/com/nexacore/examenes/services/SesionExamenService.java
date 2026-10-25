package com.nexacore.examenes.services;

import com.nexacore.examenes.repositories.ExamenSesionRepository;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import com.nexacore.examenes.dto.SesionExamenResponse;
import com.nexacore.examenes.models.Examen;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sesiones de un examen reprogramado (V41). Al repetir un examen finalizado, la sesión que terminó
 * se archiva con el resultado de cada estudiante y el examen vuelve a empezar: todos "no
 * ingresados" y sin las denegaciones del control de esa sesión.
 */
@Service
public class SesionExamenService {

    /** Prefijo con el que ControlIngresoService guarda una denegación del control. */
    static final String PREFIJO_DENEGACION = "Ingreso denegado por CONTROL:";

    private final JdbcTemplate jdbc;
    private final ExamenSesionRepository sesionRepository;
    private final ExamenAulaRepository aulaRepository;

    public SesionExamenService(JdbcTemplate jdbc, ExamenSesionRepository sesionRepository, ExamenAulaRepository aulaRepository) {
        this.jdbc = jdbc;
        this.sesionRepository = sesionRepository;
        this.aulaRepository = aulaRepository;
    }

    /** Orden compartido: examen, ambientes por ID y luego las asistencias de la operación. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void bloquearContexto(Integer idExamen) {
        aulaRepository.bloquearExamen(idExamen);
        jdbc.queryForList("""
                SELECT a.id_ambiente FROM ambiente a
                WHERE a.id_ambiente IN (
                    SELECT id_ambiente FROM examen WHERE id_examen = ?
                    UNION SELECT id_ambiente FROM examen_aula WHERE id_examen = ?
                ) ORDER BY a.id_ambiente FOR NO KEY UPDATE
                """, idExamen, idExamen);
    }

    /**
     * Si un registro (del control, intento o reporte) es de la sesión actual del examen: posterior
     * al cierre de la última sesión archivada. Lo anterior se consulta en el historial de sesiones.
     */
    @Transactional(readOnly = true)
    public boolean esDeSesionActual(Integer idExamen, LocalDateTime fechaHora) {
        LocalDateTime cierre = sesionRepository.ultimoCierre(idExamen);
        return cierre == null || fechaHora == null || fechaHora.isAfter(cierre);
    }

    /** Cierre de la última sesión archivada; null si el examen nunca se reprogramó. */
    @Transactional(readOnly = true)
    public LocalDateTime ultimoCierre(Integer idExamen) {
        return sesionRepository.ultimoCierre(idExamen);
    }

    /**
     * Guarda la sesión que terminó y deja el examen listo para la nueva fecha.
     *
     * @return número de la sesión archivada
     */
    @Transactional
    public int archivarYReiniciar(Examen examen, Integer idUsuario, String motivo) {
        Integer idExamen = examen.getId().getIdExamen();
        Integer idParalelo = examen.getId().getIdParalelo();
        jdbc.queryForList("SELECT id_estudiante FROM asistencia_examen WHERE id_examen = ? ORDER BY id_estudiante FOR UPDATE", idExamen);
        int numero = jdbc.queryForObject(
                "SELECT COALESCE(MAX(numero), 0) + 1 FROM examen_sesion WHERE id_examen = ?", Integer.class, idExamen);
        Integer idSesion = jdbc.queryForObject("""
                INSERT INTO examen_sesion (id_examen, numero, fecha, hora_inicio, duracion_minutos, id_ambiente,
                                           asociados, ingresaron, motivo_reprogramacion, id_usuario, cerrada_en)
                SELECT ?, ?, ?, ?, ?, ?,
                       COUNT(*), COUNT(fecha_hora_ingreso), ?, ?, clock_timestamp()
                FROM asistencia_examen WHERE id_examen = ? AND id_paralelo = ?
                RETURNING id_sesion
                """, Integer.class, idExamen, numero, examen.getFecha(), examen.getHoraInicio(),
                examen.getDuracionMinutos(), examen.getIdAmbiente(), motivo.strip(), idUsuario, idExamen, idParalelo);
        jdbc.update("""
                INSERT INTO asistencia_sesion (id_sesion, id_estudiante, habilitado, motivo_inhabilitacion,
                                               fecha_hora_ingreso, id_ambiente_ingreso)
                SELECT ?, id_estudiante, habilitado, motivo_inhabilitacion, fecha_hora_ingreso, id_ambiente_ingreso
                FROM asistencia_examen WHERE id_examen = ? AND id_paralelo = ?
                """, idSesion, idExamen, idParalelo);
        reiniciar(idExamen, idParalelo);
        return numero;
    }

    /** Todos vuelven a "no ingresado"; se quitan las denegaciones del control de la sesión anterior. */
    private void reiniciar(Integer idExamen, Integer idParalelo) {
        List<Map<String, Object>> denegados = jdbc.queryForList("""
                SELECT id_estudiante, motivo_inhabilitacion FROM asistencia_examen
                WHERE id_examen = ? AND id_paralelo = ? AND motivo_inhabilitacion LIKE ?
                """, idExamen, idParalelo, "%" + PREFIJO_DENEGACION + "%");
        for (Map<String, Object> fila : denegados) {
            List<String> restantes = ((String) fila.get("motivo_inhabilitacion")).lines()
                    .map(String::strip)
                    .filter(r -> !r.isEmpty() && !r.startsWith(PREFIJO_DENEGACION))
                    .toList();
            // Si la única razón era la denegación del control, queda pendiente para que la
            // administración revise su habilitación antes de la nueva fecha.
            jdbc.update("""
                    UPDATE asistencia_examen SET habilitado = ?, motivo_inhabilitacion = ?
                    WHERE id_examen = ? AND id_paralelo = ? AND id_estudiante = ?
                    """, restantes.isEmpty() ? null : Boolean.FALSE,
                    restantes.isEmpty() ? null : String.join("\n", restantes),
                    idExamen, idParalelo, fila.get("id_estudiante"));
        }
        jdbc.update("""
                UPDATE asistencia_examen
                SET fecha_hora_ingreso = NULL, id_ambiente_ingreso = NULL,
                    id_usuario_control = NULL, observaciones_control = NULL
                WHERE id_examen = ? AND id_paralelo = ?
                """, idExamen, idParalelo);
    }

    /** Sesiones anteriores, de la más reciente a la más antigua. */
    @Transactional(readOnly = true)
    public List<SesionExamenResponse> listar(Integer idExamen) {
        Map<Integer, List<SesionExamenResponse.Estudiante>> porSesion = new LinkedHashMap<>();
        jdbc.query("""
                SELECT s.id_sesion, a.id_estudiante, e.codigo_sis, e.nombre || ' ' || e.apellidos AS nombre,
                       a.habilitado, a.motivo_inhabilitacion, a.fecha_hora_ingreso, am.nombre AS aula
                FROM examen_sesion s
                JOIN asistencia_sesion a ON a.id_sesion = s.id_sesion
                JOIN estudiante e ON e.id_estudiante = a.id_estudiante
                LEFT JOIN ambiente am ON am.id_ambiente = a.id_ambiente_ingreso
                WHERE s.id_examen = ?
                ORDER BY e.apellidos, e.nombre
                """, rs -> {
            porSesion.computeIfAbsent(rs.getInt("id_sesion"), k -> new ArrayList<>()).add(
                    new SesionExamenResponse.Estudiante(rs.getInt("id_estudiante"), rs.getString("codigo_sis"),
                            rs.getString("nombre"), (Boolean) rs.getObject("habilitado"),
                            rs.getString("motivo_inhabilitacion"), fecha(rs.getTimestamp("fecha_hora_ingreso")),
                            rs.getString("aula")));
        }, idExamen);
        return jdbc.query("""
                SELECT s.*, am.nombre AS ambiente, u.nombre || ' ' || u.apellidos AS usuario
                FROM examen_sesion s
                LEFT JOIN ambiente am ON am.id_ambiente = s.id_ambiente
                LEFT JOIN usuario u ON u.id_usuario = s.id_usuario
                WHERE s.id_examen = ?
                ORDER BY s.numero DESC
                """, (rs, i) -> new SesionExamenResponse(
                rs.getInt("numero"), rs.getDate("fecha").toLocalDate(), rs.getTime("hora_inicio").toLocalTime(),
                rs.getInt("duracion_minutos"), rs.getString("ambiente"), rs.getInt("asociados"),
                rs.getInt("ingresaron"), rs.getString("motivo_reprogramacion"), rs.getString("usuario"),
                fecha(rs.getTimestamp("cerrada_en")),
                porSesion.getOrDefault(rs.getInt("id_sesion"), List.of())), idExamen);
    }

    private static LocalDateTime fecha(Timestamp t) {
        return t == null ? null : t.toLocalDateTime();
    }
}
