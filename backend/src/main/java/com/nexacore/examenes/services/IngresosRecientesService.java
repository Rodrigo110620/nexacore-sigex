package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.IngresosRecientesResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.repositories.ExamenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;

/** DASH-02: los últimos ingresos de un examen (sesión actual), del más reciente al más antiguo. */
@Service
public class IngresosRecientesService {

    static final int MAXIMO = 50;
    private static final LocalDateTime DESDE_SIEMPRE = LocalDateTime.of(2000, 1, 1, 0, 0);

    private final NamedParameterJdbcTemplate jdbc;
    private final ExamenRepository examenRepository;
    private final SesionExamenService sesionExamenService;

    public IngresosRecientesService(NamedParameterJdbcTemplate jdbc, ExamenRepository examenRepository,
                                    SesionExamenService sesionExamenService) {
        this.jdbc = jdbc;
        this.examenRepository = examenRepository;
        this.sesionExamenService = sesionExamenService;
    }

    @Transactional(readOnly = true)
    public IngresosRecientesResponse recientes(Integer idExamen, int cantidad) {
        return recientes(idExamen, cantidad, 0);
    }

    /** pagina: desde 0; cada página trae «cantidad» ingresos. */
    @Transactional(readOnly = true)
    public IngresosRecientesResponse recientes(Integer idExamen, int cantidad, int pagina) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
        LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        var p = new MapSqlParameterSource("examen", idExamen)
                .addValue("desde", Timestamp.valueOf(cierre == null ? DESDE_SIEMPRE : cierre))
                .addValue("cantidad", Math.max(1, Math.min(cantidad, MAXIMO)));
        p.addValue("desplazamiento", (long) Math.max(pagina, 0) * (Integer) p.getValue("cantidad"));
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM asistencia_examen WHERE id_examen = :examen AND fecha_hora_ingreso IS NOT NULL", p, Long.class);
        var ingresos = jdbc.query("""
                SELECT a.id_estudiante, e.nombre, e.apellidos, e.codigo_sis, a.fecha_hora_ingreso, am.nombre,
                       EXISTS (SELECT 1 FROM estudiante_foto f WHERE f.id_estudiante = a.id_estudiante),
                       EXISTS (SELECT 1 FROM expulsion x WHERE x.id_examen = :examen AND x.id_estudiante = a.id_estudiante
                                 AND x.anulada_en IS NULL AND x.fecha_hora > :desde)
                FROM asistencia_examen a
                JOIN estudiante e ON e.id_estudiante = a.id_estudiante
                LEFT JOIN ambiente am ON am.id_ambiente = a.id_ambiente_ingreso
                WHERE a.id_examen = :examen AND a.fecha_hora_ingreso IS NOT NULL
                ORDER BY a.fecha_hora_ingreso DESC, a.id_estudiante
                LIMIT :cantidad OFFSET :desplazamiento
                """, p, (rs, i) -> new IngresosRecientesResponse.Ingreso(rs.getInt(1), rs.getString(2), rs.getString(3),
                rs.getString(4), EstudianteService.fotoUrl(rs.getInt(1), rs.getBoolean(7)),
                rs.getTimestamp(5).toLocalDateTime(), rs.getString(6), rs.getBoolean(8)));
        return new IngresosRecientesResponse(total == null ? 0 : total, ingresos);
    }
}
