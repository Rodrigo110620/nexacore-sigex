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

/** DASH-02: una fila por estudiante que ingresó (ingreso, salida, expulsión y traslado), por actividad más reciente. */
@Service
public class IngresosRecientesService {

    static final int MAXIMO = 50;
    private static final LocalDateTime DESDE_SIEMPRE = LocalDateTime.of(2000, 1, 1, 0, 0);

    private final NamedParameterJdbcTemplate jdbc;
    private final ExamenRepository examenRepository;
    private final SesionExamenService sesionExamenService;

    /** Salida al cierre (V56); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SalidaExamenService salidaExamenService;

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
        LocalDateTime fin = salidaExamenService == null ? null : salidaExamenService.finSiTermino(idExamen);
        var ingresos = jdbc.query("""
                SELECT a.id_estudiante, e.nombre, e.apellidos, e.codigo_sis, a.fecha_hora_ingreso, am.nombre, a.fecha_hora_salida,
                       x.fecha_hora, x.motivo, x.anulada_en IS NOT NULL, t.fecha_hora_traslado,
                       CASE WHEN t.id_traslado IS NULL THEN NULL ELSE COALESCE(ao.nombre, '?') || ' → ' || COALESCE(ad.nombre, '?') END,
                       EXISTS (SELECT 1 FROM estudiante_foto f WHERE f.id_estudiante = a.id_estudiante)
                FROM asistencia_examen a
                JOIN estudiante e ON e.id_estudiante = a.id_estudiante
                LEFT JOIN ambiente am ON am.id_ambiente = a.id_ambiente_ingreso
                LEFT JOIN LATERAL (SELECT fecha_hora, motivo, anulada_en FROM expulsion
                                   WHERE id_examen = :examen AND id_estudiante = a.id_estudiante AND fecha_hora > :desde
                                   ORDER BY fecha_hora DESC LIMIT 1) x ON TRUE
                LEFT JOIN LATERAL (SELECT id_traslado, fecha_hora_traslado, id_ambiente_origen, id_ambiente_destino FROM traslado_ambiente
                                   WHERE id_examen = :examen AND id_estudiante = a.id_estudiante AND fecha_hora_traslado > :desde
                                   ORDER BY fecha_hora_traslado DESC LIMIT 1) t ON TRUE
                LEFT JOIN ambiente ao ON ao.id_ambiente = t.id_ambiente_origen
                LEFT JOIN ambiente ad ON ad.id_ambiente = t.id_ambiente_destino
                WHERE a.id_examen = :examen AND a.fecha_hora_ingreso IS NOT NULL
                ORDER BY GREATEST(a.fecha_hora_ingreso, COALESCE(a.fecha_hora_salida, a.fecha_hora_ingreso),
                                  COALESCE(x.fecha_hora, a.fecha_hora_ingreso), COALESCE(t.fecha_hora_traslado, a.fecha_hora_ingreso)) DESC,
                         a.id_estudiante
                LIMIT :cantidad OFFSET :desplazamiento
                """, p, (rs, n) -> {
            LocalDateTime salida = rs.getTimestamp(7) == null ? null : rs.getTimestamp(7).toLocalDateTime();
            LocalDateTime expulsion = rs.getTimestamp(8) == null ? null : rs.getTimestamp(8).toLocalDateTime();
            boolean anulada = rs.getBoolean(10);
            // Sin salida marcada, sin expulsión vigente y con el examen terminado: salió al cierre.
            boolean alCierre = salida == null && fin != null && (expulsion == null || anulada);
            return new IngresosRecientesResponse.Fila(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4),
                    EstudianteService.fotoUrl(rs.getInt(1), rs.getBoolean(13)), rs.getTimestamp(5).toLocalDateTime(), rs.getString(6),
                    alCierre ? fin : salida, alCierre, expulsion, rs.getString(9), anulada,
                    rs.getTimestamp(11) == null ? null : rs.getTimestamp(11).toLocalDateTime(), rs.getString(12));
        });
        return new IngresosRecientesResponse(total == null ? 0 : total, ingresos);
    }
}
