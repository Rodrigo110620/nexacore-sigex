package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.OcupacionAulaResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * DASH-03 (alerta de aforo): ocupación de cada aula de un examen en la sesión actual. Un estudiante ocupa el aula
 * donde quedó registrado su ingreso (el trasladado, su aula nueva); el expulsado ya salió y no cuenta. Se incluyen el
 * aula principal, las adicionales y cualquier aula a la que se haya trasladado a alguien.
 */
@Service
public class AforoService {

    private static final LocalDateTime DESDE_SIEMPRE = LocalDateTime.of(2000, 1, 1, 0, 0);

    private final NamedParameterJdbcTemplate jdbc;
    private final SesionExamenService sesionExamenService;

    public AforoService(NamedParameterJdbcTemplate jdbc, SesionExamenService sesionExamenService) {
        this.jdbc = jdbc;
        this.sesionExamenService = sesionExamenService;
    }

    @Transactional(readOnly = true)
    public List<OcupacionAulaResponse> delExamen(Integer idExamen) {
        LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        var p = new MapSqlParameterSource("examen", idExamen)
                .addValue("desde", Timestamp.valueOf(cierre == null ? DESDE_SIEMPRE : cierre));
        return jdbc.query("""
                SELECT am.id_ambiente, am.nombre, am.capacidad, MIN(au.orden) AS orden,
                       (SELECT COUNT(*) FROM asistencia_examen a
                         WHERE a.id_examen = :examen AND a.id_ambiente_ingreso = am.id_ambiente AND a.fecha_hora_ingreso IS NOT NULL
                           AND NOT EXISTS (SELECT 1 FROM expulsion x
                                            WHERE x.id_examen = :examen AND x.id_estudiante = a.id_estudiante
                                              AND x.anulada_en IS NULL AND x.fecha_hora > :desde))
                FROM (SELECT id_ambiente, 0 AS orden FROM examen WHERE id_examen = :examen
                      UNION SELECT id_ambiente, orden FROM examen_aula WHERE id_examen = :examen
                      UNION SELECT id_ambiente_ingreso, 999 FROM asistencia_examen
                             WHERE id_examen = :examen AND fecha_hora_ingreso IS NOT NULL AND id_ambiente_ingreso IS NOT NULL) au
                JOIN ambiente am ON am.id_ambiente = au.id_ambiente
                GROUP BY am.id_ambiente, am.nombre, am.capacidad
                ORDER BY MIN(au.orden), am.nombre
                """, p, (rs, i) -> {
            Integer capacidad = (Integer) rs.getObject(3);
            int ocupados = rs.getInt(5);
            return new OcupacionAulaResponse(rs.getInt(1), rs.getString(2), capacidad, ocupados,
                    OcupacionAulaResponse.estadoDe(capacidad, ocupados));
        });
    }

    public Optional<OcupacionAulaResponse> delAula(Integer idExamen, Integer idAmbiente) {
        return delExamen(idExamen).stream().filter(o -> o.idAmbiente().equals(idAmbiente)).findFirst();
    }
}
