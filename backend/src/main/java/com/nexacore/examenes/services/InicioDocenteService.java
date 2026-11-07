package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.InicioDocenteResponse;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Panel de inicio del DOCENTE: lo de sus materias y sus exámenes (no ve los de otros docentes). */
@Service
public class InicioDocenteService {

    static final int RECIENTES = 6;

    private final NamedParameterJdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final AsistenciaExamenRepository asistenciaExamenRepository;

    public InicioDocenteService(NamedParameterJdbcTemplate jdbc, UsuarioRepository usuarioRepository,
                                AsistenciaExamenRepository asistenciaExamenRepository) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.asistenciaExamenRepository = asistenciaExamenRepository;
    }

    @Transactional(readOnly = true)
    public InicioDocenteResponse resumen() {
        Integer yo = usuarioRepository.findByEmail(SesionActual.email()).map(Usuario::getId).orElse(-1);
        LocalDateTime ahora = asistenciaExamenRepository.obtenerFechaHoraServidor();
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("yo", yo)
                .addValue("ahora", Timestamp.valueOf(ahora))
                .addValue("hoy", java.sql.Date.valueOf(ahora.toLocalDate()))
                .addValue("desde", Timestamp.valueOf(ahora.toLocalDate().atStartOfDay()))
                .addValue("hasta", Timestamp.valueOf(ahora.toLocalDate().plusDays(1).atStartOfDay()));

        Map<Integer, List<String>> grupos = new LinkedHashMap<>();
        jdbc.query("SELECT id_materia, nombre_grupo FROM paralelo WHERE id_docente = :yo ORDER BY nombre_grupo", p,
                rs -> { grupos.computeIfAbsent(rs.getInt(1), k -> new ArrayList<>()).add(rs.getString(2)); });

        List<InicioDocenteResponse.Materia> materias = jdbc.query("""
                SELECT m.id_materia, m.sigla, m.nombre,
                       (SELECT COUNT(DISTINCT i.id_estudiante) FROM inscripcion_paralelo i
                         WHERE i.id_docente = :yo AND i.id_materia = m.id_materia AND LOWER(i.estado) = 'inscrito'),
                       (SELECT CASE WHEN SUM(CASE WHEN a.habilitado THEN 1 ELSE 0 END) = 0 THEN NULL
                               ELSE ROUND(100.0 * SUM(CASE WHEN a.habilitado AND a.fecha_hora_ingreso IS NOT NULL THEN 1 ELSE 0 END)
                                          / SUM(CASE WHEN a.habilitado THEN 1 ELSE 0 END)) END
                          FROM asistencia_examen a JOIN examen x ON x.id_examen = a.id_examen AND x.id_paralelo = a.id_paralelo
                         WHERE x.id_docente = :yo AND x.id_materia = m.id_materia AND x.fecha <= :hoy AND LOWER(x.estado) <> 'cancelado')
                FROM docente_materia dm JOIN materia m ON m.id_materia = dm.id_materia
                WHERE dm.id_docente = :yo
                ORDER BY m.nombre
                """, p, (rs, i) -> {
            int idMateria = rs.getInt(1);
            Number asistencia = (Number) rs.getObject(5);
            return new InicioDocenteResponse.Materia(idMateria, rs.getString(2), rs.getString(3),
                    grupos.getOrDefault(idMateria, List.of()), rs.getInt(4), proximoExamen(p, idMateria, ahora),
                    asistencia == null ? null : asistencia.intValue());
        });

        int estudiantes = contar("SELECT COUNT(DISTINCT id_estudiante) FROM inscripcion_paralelo WHERE id_docente = :yo AND LOWER(estado) = 'inscrito'", p);
        int expulsionesHoy = contar("""
                SELECT COUNT(*) FROM expulsion e JOIN (SELECT DISTINCT id_examen FROM examen WHERE id_docente = :yo) x ON x.id_examen = e.id_examen
                WHERE e.fecha_hora >= :desde AND e.fecha_hora < :hasta AND e.anulada_en IS NULL
                """, p);
        int[] ingresosPorHora = porHora("""
                SELECT EXTRACT(HOUR FROM r.fecha_hora), COUNT(*) FROM registro_control_ingreso r
                JOIN (SELECT DISTINCT id_examen FROM examen WHERE id_docente = :yo) x ON x.id_examen = r.id_examen
                WHERE r.resultado_autorizacion = 'AUTORIZADO' AND r.fecha_hora >= :desde AND r.fecha_hora < :hasta
                GROUP BY EXTRACT(HOUR FROM r.fecha_hora)
                """, p);
        int[] expulsionesPorHora = porHora("""
                SELECT EXTRACT(HOUR FROM e.fecha_hora), COUNT(*) FROM expulsion e
                JOIN (SELECT DISTINCT id_examen FROM examen WHERE id_docente = :yo) x ON x.id_examen = e.id_examen
                WHERE e.fecha_hora >= :desde AND e.fecha_hora < :hasta AND e.anulada_en IS NULL
                GROUP BY EXTRACT(HOUR FROM e.fecha_hora)
                """, p);

        List<InicioDocenteResponse.Registro> recientes = jdbc.query("""
                SELECT r.fecha, r.tipo, TRIM(COALESCE(e.nombre, '') || ' ' || COALESCE(e.apellidos, '')), mx.nombre, r.detalle
                FROM (
                    SELECT c.fecha_hora AS fecha, 'INGRESO' AS tipo, c.id_estudiante, c.id_examen,
                           CAST(am.nombre AS VARCHAR(200)) AS detalle
                    FROM registro_control_ingreso c
                    JOIN asistencia_examen a ON a.id_estudiante = c.id_estudiante AND a.id_examen = c.id_examen
                    LEFT JOIN ambiente am ON am.id_ambiente = a.id_ambiente_ingreso
                    WHERE c.resultado_autorizacion = 'AUTORIZADO' AND c.fecha_hora >= :desde AND c.fecha_hora < :hasta
                    UNION ALL
                    SELECT fecha_hora, 'EXPULSION', id_estudiante, id_examen, CAST(motivo AS VARCHAR(200)) FROM expulsion
                    WHERE fecha_hora >= :desde AND fecha_hora < :hasta AND anulada_en IS NULL
                    UNION ALL
                    SELECT fecha_hora, 'INTENTO', id_estudiante, id_examen, CAST(observacion AS VARCHAR(200)) FROM intento_ingreso
                    WHERE fecha_hora >= :desde AND fecha_hora < :hasta
                ) r
                JOIN (SELECT DISTINCT x.id_examen, mt.nombre FROM examen x JOIN materia mt ON mt.id_materia = x.id_materia
                      WHERE x.id_docente = :yo) mx ON mx.id_examen = r.id_examen
                LEFT JOIN estudiante e ON e.id_estudiante = r.id_estudiante
                ORDER BY r.fecha DESC
                LIMIT :limite
                """, new MapSqlParameterSource(p.getValues()).addValue("limite", RECIENTES), (rs, i) -> {
            String nombre = rs.getString(3);
            return new InicioDocenteResponse.Registro(rs.getTimestamp(1).toLocalDateTime(), rs.getString(2),
                    nombre == null || nombre.isBlank() ? null : nombre, rs.getString(4), rs.getString(5));
        });

        int totalGrupos = grupos.values().stream().mapToInt(List::size).sum();
        return new InicioDocenteResponse(ahora, materias, totalGrupos, estudiantes, expulsionesHoy, ingresosPorHora,
                expulsionesPorHora, recientes);
    }

    /** El próximo examen de la materia que aún no terminó (de hoy en adelante). */
    private InicioDocenteResponse.ProximoExamen proximoExamen(MapSqlParameterSource p, int idMateria, LocalDateTime ahora) {
        List<InicioDocenteResponse.ProximoExamen> lista = jdbc.query("""
                SELECT id_examen, fecha, hora_inicio, duracion_minutos FROM examen
                WHERE id_docente = :yo AND id_materia = :materia AND fecha >= :hoy AND LOWER(estado) <> 'cancelado'
                ORDER BY fecha, hora_inicio
                """, new MapSqlParameterSource(p.getValues()).addValue("materia", idMateria), (rs, i) ->
                new InicioDocenteResponse.ProximoExamen(rs.getInt(1), rs.getDate(2).toLocalDate(),
                        rs.getTime(3).toLocalTime(), rs.getInt(4)));
        return lista.stream()
                .filter(x -> x.fecha().atTime(x.horaInicio()).plusMinutes(x.duracionMinutos()).isAfter(ahora))
                .findFirst().orElse(null);
    }

    private int[] porHora(String sql, MapSqlParameterSource p) {
        int[] horas = new int[24];
        jdbc.query(sql, p, rs -> { horas[rs.getInt(1)] = rs.getInt(2); });
        return horas;
    }

    private int contar(String sql, MapSqlParameterSource p) {
        Integer n = jdbc.queryForObject(sql, p, Integer.class);
        return n == null ? 0 : n;
    }
}
