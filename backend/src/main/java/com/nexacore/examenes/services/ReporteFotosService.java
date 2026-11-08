package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ReporteFotoFilaResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Reporte de fotos reportadas (Reportes): de todos los exámenes con REPORTES_VER; si no, solo de los exámenes del
 * usuario como docente o como personal de control asignado (V53). Incluye los ya resueltos, para que quede constancia.
 */
@Service
public class ReporteFotosService {

    static final int MAXIMO = 500;

    private final NamedParameterJdbcTemplate jdbc;

    public ReporteFotosService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** {@code soloDe} null: todos; si no, solo los exámenes de ese usuario. {@code idExamen} null: todos los exámenes. */
    @Transactional(readOnly = true)
    public List<ReporteFotoFilaResponse> listar(Integer idExamen, Integer soloDe) {
        return jdbc.query("""
                SELECT r.id_reporte, r.id_examen, m.nombre, r.id_estudiante, TRIM(e.nombre || ' ' || e.apellidos), e.codigo_sis,
                       r.motivo, r.detalle, TRIM(u.nombre || ' ' || u.apellidos), r.creado_en, r.estado, r.resolucion, r.resuelto_en
                FROM reporte_foto r
                JOIN estudiante e ON e.id_estudiante = r.id_estudiante
                LEFT JOIN usuario u ON u.id_usuario = r.id_usuario
                LEFT JOIN (SELECT DISTINCT x.id_examen, mt.nombre FROM examen x JOIN materia mt ON mt.id_materia = x.id_materia) m
                       ON m.id_examen = r.id_examen
                WHERE (CAST(:idExamen AS INTEGER) IS NULL OR r.id_examen = CAST(:idExamen AS INTEGER))
                  AND (CAST(:soloDe AS INTEGER) IS NULL OR r.id_examen IN (
                       SELECT d.id_examen FROM examen d WHERE d.id_docente = CAST(:soloDe AS INTEGER)
                       UNION SELECT c.id_examen FROM examen_control c WHERE c.id_usuario = CAST(:soloDe AS INTEGER)))
                ORDER BY r.creado_en DESC, r.id_reporte DESC
                LIMIT :maximo
                """, new MapSqlParameterSource().addValue("idExamen", idExamen).addValue("soloDe", soloDe).addValue("maximo", MAXIMO),
                (rs, i) -> new ReporteFotoFilaResponse(
                        rs.getInt(1), (Integer) rs.getObject(2), rs.getString(3), rs.getInt(4), rs.getString(5), rs.getString(6),
                        rs.getString(7), rs.getString(8), rs.getString(9), rs.getTimestamp(10).toLocalDateTime(),
                        "ABIERTO".equals(rs.getString(11)) ? "PENDIENTE" : rs.getString(12),
                        rs.getTimestamp(13) == null ? null : rs.getTimestamp(13).toLocalDateTime()));
    }
}
