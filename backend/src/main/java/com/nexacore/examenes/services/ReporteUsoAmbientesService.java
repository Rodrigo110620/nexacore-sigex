package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ReporteUsoAmbienteResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReporteUsoAmbientesService {

    private final NamedParameterJdbcTemplate jdbc;

    public ReporteUsoAmbientesService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ReporteUsoAmbienteResponse> listar(Integer idExamen, Integer soloDe) {
        // Esta consulta une el aula principal del examen con las adicionales, 
        // y cuenta cuántos estudiantes ingresaron a cada una.
        return jdbc.query("""
            WITH ambientes_asignados AS (
                -- Aula principal del examen
                SELECT id_examen, id_ambiente FROM public.examen
                UNION
                -- Aulas adicionales (si hay)
                SELECT id_examen, id_ambiente FROM public.examen_aula
            )
            SELECT 
                ex.id_examen,
                amb.nombre AS ambiente,
                u.nombre || ' ' || u.apellidos AS docente,
                m.nombre || ' · ' || p.nombre_grupo AS materia_grupo,
                ex.fecha,
                ex.hora_inicio,
                COUNT(asi.id_estudiante) AS ingresos
            FROM ambientes_asignados a
            JOIN public.examen ex ON ex.id_examen = a.id_examen
            JOIN public.ambiente amb ON amb.id_ambiente = a.id_ambiente
            JOIN public.usuario u ON u.id_usuario = ex.id_docente
            JOIN public.materia m ON m.id_materia = ex.id_materia
            JOIN public.paralelo p ON p.id_paralelo = ex.id_paralelo AND p.id_materia = ex.id_materia AND p.id_docente = ex.id_docente
            -- Contamos los ingresos reales en esta aula específica
            LEFT JOIN public.asistencia_examen asi 
                   ON asi.id_examen = a.id_examen 
                  AND asi.id_ambiente_ingreso = a.id_ambiente 
                  AND asi.fecha_hora_ingreso IS NOT NULL
            WHERE (CAST(:idExamen AS INTEGER) IS NULL OR a.id_examen = CAST(:idExamen AS INTEGER))
              -- Filtro de permisos: ADMIN ve todos, DOCENTE ve los suyos
              AND (CAST(:soloDe AS INTEGER) IS NULL OR ex.id_docente = CAST(:soloDe AS INTEGER) OR ex.id_examen IN (
                  SELECT ec.id_examen FROM public.examen_control ec WHERE ec.id_usuario = CAST(:soloDe AS INTEGER)
              ))
            GROUP BY ex.id_examen, amb.nombre, u.nombre, u.apellidos, m.nombre, p.nombre_grupo, ex.fecha, ex.hora_inicio
            ORDER BY ex.fecha DESC, ex.hora_inicio DESC, amb.nombre ASC
            LIMIT 1000
            """, new MapSqlParameterSource()
                .addValue("idExamen", idExamen)
                .addValue("soloDe", soloDe),
            (rs, i) -> {
                int ingresos = rs.getInt("ingresos");
                return new ReporteUsoAmbienteResponse(
                    rs.getInt("id_examen"),
                    rs.getString("ambiente"),
                    rs.getString("docente"),
                    rs.getString("materia_grupo"),
                    rs.getDate("fecha").toLocalDate(),
                    rs.getTime("hora_inicio").toLocalTime(),
                    ingresos,
                    ingresos > 0
                );
            });
    }
}