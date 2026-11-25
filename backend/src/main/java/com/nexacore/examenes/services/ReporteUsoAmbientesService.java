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
                -- Aula principal del examen y las adicionales (si hay)
                SELECT id_examen, id_ambiente FROM public.examen
                UNION
                SELECT id_examen, id_ambiente FROM public.examen_aula
            )
            SELECT
                ex.id_examen,
                amb.nombre AS ambiente,
                amb.capacidad,
                u.nombre || ' ' || u.apellidos AS docente,
                m.nombre AS materia,
                p.nombre_grupo AS grupo,
                ex.fecha,
                ex.hora_inicio,
                ex.duracion_minutos,
                (ex.fecha + ex.hora_inicio + make_interval(mins => ex.duracion_minutos)) > timezone('America/La_Paz', clock_timestamp()) AS pendiente,
                COUNT(asi.id_estudiante) AS ingresos
            FROM ambientes_asignados a
            JOIN public.examen ex ON ex.id_examen = a.id_examen
            JOIN public.ambiente amb ON amb.id_ambiente = a.id_ambiente
            JOIN public.usuario u ON u.id_usuario = ex.id_docente
            JOIN public.materia m ON m.id_materia = ex.id_materia
            JOIN public.paralelo p ON p.id_paralelo = ex.id_paralelo AND p.id_materia = ex.id_materia AND p.id_docente = ex.id_docente
            -- Ingresos reales en esta aula específica
            LEFT JOIN public.asistencia_examen asi
                   ON asi.id_examen = a.id_examen
                  AND asi.id_ambiente_ingreso = a.id_ambiente
                  AND asi.fecha_hora_ingreso IS NOT NULL
            WHERE (CAST(:idExamen AS INTEGER) IS NULL OR a.id_examen = CAST(:idExamen AS INTEGER))
              -- Los cancelados no usaron sus aulas: no cuentan como «sin uso».
              AND lower(coalesce(ex.estado, '')) <> 'cancelado'
              -- Filtro de permisos: ADMIN ve todos; el DOCENTE los suyos; el CONTROL aquellos donde está asignado
              AND (CAST(:soloDe AS INTEGER) IS NULL OR ex.id_docente = CAST(:soloDe AS INTEGER) OR ex.id_examen IN (
                  SELECT ec.id_examen FROM public.examen_control ec WHERE ec.id_usuario = CAST(:soloDe AS INTEGER)
              ))
            GROUP BY ex.id_examen, amb.nombre, amb.capacidad, u.nombre, u.apellidos, m.nombre, p.nombre_grupo, ex.fecha,
                     ex.hora_inicio, ex.duracion_minutos
            ORDER BY ex.fecha DESC, ex.hora_inicio DESC, amb.nombre ASC
            LIMIT 1000
            """, new MapSqlParameterSource()
                .addValue("idExamen", idExamen)
                .addValue("soloDe", soloDe),
            (rs, i) -> {
                int ingresos = rs.getInt("ingresos");
                java.time.LocalTime inicio = rs.getTime("hora_inicio").toLocalTime();
                boolean pendiente = rs.getBoolean("pendiente");
                String estado = ingresos > 0 ? "UTILIZADO" : pendiente ? "PENDIENTE" : "SIN_USO";
                return new ReporteUsoAmbienteResponse(
                    rs.getInt("id_examen"),
                    rs.getString("ambiente"),
                    (Integer) rs.getObject("capacidad"),
                    rs.getString("docente"),
                    rs.getString("materia"),
                    rs.getString("grupo"),
                    rs.getDate("fecha").toLocalDate(),
                    inicio,
                    inicio.plusMinutes(rs.getInt("duracion_minutos")),
                    ingresos,
                    ingresos > 0,
                    estado
                );
            });
    }
}