package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ReporteIngresoResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ReporteIngresosService {
    private final NamedParameterJdbcTemplate jdbc;

    public ReporteIngresosService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ReporteIngresoResponse> listar(Integer idExamen, Integer soloDe) {
        return jdbc.query("""
            SELECT r.id_control, 
                   m.nombre || ' · ' || p.nombre_grupo AS examen,
                   e.nombre || ' ' || e.apellidos AS estudiante,
                   e.codigo_sis,
                   r.tipo_ingreso,
                   u.nombre || ' ' || u.apellidos AS controlador,
                   r.fecha_hora
            FROM registro_control_ingreso r
            JOIN estudiante e ON e.id_estudiante = r.id_estudiante
            JOIN usuario u ON u.id_usuario = r.id_usuario_control
            JOIN examen x ON x.id_examen = r.id_examen AND x.id_paralelo = r.id_paralelo
            JOIN materia m ON m.id_materia = x.id_materia
            JOIN paralelo p ON p.id_paralelo = x.id_paralelo AND p.id_materia = x.id_materia AND p.id_docente = x.id_docente
            WHERE r.resultado_autorizacion = 'AUTORIZADO'
              AND (CAST(:idExamen AS INTEGER) IS NULL OR r.id_examen = CAST(:idExamen AS INTEGER))
              AND (CAST(:soloDe AS INTEGER) IS NULL OR r.id_examen IN (
                  SELECT d.id_examen FROM examen d WHERE d.id_docente = CAST(:soloDe AS INTEGER)
                  UNION SELECT c.id_examen FROM examen_control c WHERE c.id_usuario = CAST(:soloDe AS INTEGER)
              ))
            ORDER BY r.fecha_hora DESC
            LIMIT 1000
            """, new MapSqlParameterSource()
                .addValue("idExamen", idExamen)
                .addValue("soloDe", soloDe),
            (rs, i) -> new ReporteIngresoResponse(
                rs.getInt("id_control"),
                rs.getString("examen"),
                rs.getString("estudiante"),
                rs.getString("codigo_sis"),
                rs.getString("tipo_ingreso"),
                rs.getString("controlador"),
                rs.getTimestamp("fecha_hora").toLocalDateTime()
            ));
    }
}