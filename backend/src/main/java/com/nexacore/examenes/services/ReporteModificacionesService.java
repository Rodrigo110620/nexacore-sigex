package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ReporteModificacionInhabilitadoResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReporteModificacionesService {

    private final NamedParameterJdbcTemplate jdbc;

    public ReporteModificacionesService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ReporteModificacionInhabilitadoResponse> listar(Integer idExamen, Integer soloDe) {
        // Consulta real: Desarma el JSON de auditoría, filtra donde el estado anterior era NO_HABILITADO
        // y cruza con las tablas de estudiante, usuario, examen y materia.
                return jdbc.query("""
            SELECT 
                a.id_auditoria,
                (a.detalles::jsonb ->> 'idExamen')::int AS id_examen,
                m.nombre || ' · ' || p.nombre_grupo AS examen,
                e.nombre || ' ' || e.apellidos AS estudiante,
                e.codigo_sis,
                u.nombre || ' ' || u.apellidos AS docente,
                (a.detalles::jsonb ->> 'estado') AS accion_nueva,
                (est ->> 'estadoAnterior') AS estado_anterior,
                a.fecha_hora,
                a.accion AS tipo_accion,
                (a.detalles::jsonb ->> 'motivoFallo') AS motivo_fallo
            FROM auditoria_operacion a
            JOIN usuario u ON u.id_usuario = a.id_usuario
            CROSS JOIN LATERAL jsonb_array_elements(a.detalles::jsonb -> 'estudiantes') AS est
            JOIN estudiante e ON e.id_estudiante = (est ->> 'idEstudiante')::int
            JOIN examen x ON x.id_examen = (a.detalles::jsonb ->> 'idExamen')::int 
                         AND x.id_paralelo = (a.detalles::jsonb ->> 'idParalelo')::int
            JOIN materia m ON m.id_materia = x.id_materia
            JOIN paralelo p ON p.id_paralelo = x.id_paralelo AND p.id_materia = x.id_materia AND p.id_docente = x.id_docente
            WHERE a.accion IN ('HABILITACION_ACTUALIZADA', 'HABILITACION_FALLIDA')
              AND est ->> 'estadoAnterior' = 'NO_HABILITADO'
              AND (CAST(:idExamen AS INTEGER) IS NULL OR (a.detalles::jsonb ->> 'idExamen')::int = CAST(:idExamen AS INTEGER))
              AND (CAST(:soloDe AS INTEGER) IS NULL OR a.id_usuario = CAST(:soloDe AS INTEGER))
            ORDER BY a.fecha_hora DESC
            LIMIT 500
            """, new MapSqlParameterSource()
                .addValue("idExamen", idExamen)
                .addValue("soloDe", soloDe),
            (rs, i) -> new ReporteModificacionInhabilitadoResponse(
                rs.getInt("id_auditoria"),
                rs.getInt("id_examen"),
                rs.getString("examen"),
                rs.getString("estudiante"),
                rs.getString("codigo_sis"),
                rs.getString("docente"),
                rs.getString("accion_nueva"),
                rs.getString("estado_anterior"),
                "HABILITACION_FALLIDA".equals(rs.getString("tipo_accion")),
                rs.getString("motivo_fallo"),
                rs.getTimestamp("fecha_hora").toLocalDateTime()
            ));
    }
}