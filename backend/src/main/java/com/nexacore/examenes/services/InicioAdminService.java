package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.InicioAdminResponse;
import com.nexacore.examenes.models.EstudianteFotoSolicitud;
import com.nexacore.examenes.models.ReporteFoto;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resumen del panel de inicio del ADMIN. Todo con la hora del servidor (Bolivia), como el control de
 * ingreso. Un examen cuenta como "por iniciar" hasta su hora de inicio; desde entonces, sus habilitados que
 * no ingresaron cuentan como ausentes. Las sesiones ya cerradas de un examen reprogramado (examen_sesion)
 * suman en el día en que se rindieron.
 */
@Service
public class InicioAdminService {

    static final int DIAS = 7;
    static final int MAX_MOTIVOS = 5;
    static final String OTROS = "Otros motivos";
    static final String AULA_INCORRECTA = "Aula incorrecta";
    /** La excepción de un no habilitado (INCI-04) también deja un intento: ese no se cuenta dos veces. */
    private static final String MARCA_EXCEPCION = "Intento ingresar no habilitado ###%";

    private final NamedParameterJdbcTemplate jdbc;
    private final AsistenciaExamenRepository asistenciaExamenRepository;

    public InicioAdminService(NamedParameterJdbcTemplate jdbc, AsistenciaExamenRepository asistenciaExamenRepository) {
        this.jdbc = jdbc;
        this.asistenciaExamenRepository = asistenciaExamenRepository;
    }

    private record FilaExamen(int idExamen, LocalDate fecha, LocalDateTime inicio, LocalDateTime fin,
                              int asociados, int habilitados, int ingresados) {
        int faltan() { return Math.max(0, habilitados - ingresados); }
    }

    @Transactional(readOnly = true)
    public InicioAdminResponse resumen() {
        LocalDateTime ahora = asistenciaExamenRepository.obtenerFechaHoraServidor();
        LocalDate hoy = ahora.toLocalDate();
        LocalDate desde = hoy.minusDays(DIAS - 1L);
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("desde", Date.valueOf(desde))
                .addValue("hasta", Date.valueOf(hoy))
                .addValue("desdeHora", Timestamp.valueOf(desde.atStartOfDay()))
                .addValue("inicioHoy", Timestamp.valueOf(hoy.atStartOfDay()))
                .addValue("finHoy", Timestamp.valueOf(hoy.plusDays(1).atStartOfDay()))
                .addValue("marca", MARCA_EXCEPCION);

        List<FilaExamen> examenes = examenesDelPeriodo(p);
        Map<LocalDate, int[]> dias = new LinkedHashMap<>();
        for (int i = 0; i < DIAS; i++) dias.put(desde.plusDays(i), new int[4]);

        List<InicioAdminResponse.ExamenHoy> deHoy = new ArrayList<>();
        int[] esperados = new int[24];
        int enCurso = 0, asociadosHoy = 0, ingresadosHoy = 0, porIngresar = 0, ausentesHoy = 0;
        for (FilaExamen e : examenes) {
            boolean empezo = !ahora.isBefore(e.inicio());
            int[] d = dias.get(e.fecha());
            d[0] += e.asociados();
            d[1] += e.ingresados();
            if (empezo) d[2] += e.faltan();
            if (!e.fecha().equals(hoy)) continue;
            deHoy.add(new InicioAdminResponse.ExamenHoy(e.idExamen(), e.asociados(), e.habilitados(), e.ingresados()));
            asociadosHoy += e.asociados();
            ingresadosHoy += e.ingresados();
            if (empezo) {
                ausentesHoy += e.faltan();
                if (ahora.isBefore(e.fin())) enCurso++;
            } else {
                porIngresar += e.faltan();
                esperados[e.inicio().getHour()] += e.faltan();
            }
        }
        jdbc.query("""
                SELECT fecha, SUM(asociados), SUM(ingresaron) FROM examen_sesion
                WHERE fecha BETWEEN :desde AND :hasta GROUP BY fecha
                """, p, rs -> {
            int[] d = dias.get(rs.getDate(1).toLocalDate());
            int asociados = rs.getInt(2), ingresaron = rs.getInt(3);
            d[0] += asociados;
            d[1] += ingresaron;
            d[2] += Math.max(0, asociados - ingresaron);
        });
        incidenciasPorDia(p, dias);

        int[] ingresosPorHora = new int[24];
        jdbc.query("""
                SELECT EXTRACT(HOUR FROM fecha_hora_ingreso), COUNT(*) FROM asistencia_examen
                WHERE fecha_hora_ingreso >= :inicioHoy AND fecha_hora_ingreso < :finHoy
                GROUP BY EXTRACT(HOUR FROM fecha_hora_ingreso)
                """, p, rs -> { ingresosPorHora[rs.getInt(1)] = rs.getInt(2); });

        List<InicioAdminResponse.Dia> listaDias = dias.entrySet().stream()
                .map(en -> new InicioAdminResponse.Dia(en.getKey(), en.getValue()[0], en.getValue()[1], en.getValue()[2], en.getValue()[3]))
                .toList();
        int incidenciasHoy = dias.get(hoy)[3];
        return new InicioAdminResponse(ahora,
                new InicioAdminResponse.Hoy(deHoy.size(), enCurso, asociadosHoy, ingresadosHoy, porIngresar, ausentesHoy, incidenciasHoy),
                deHoy, ingresosPorHora, esperados, listaDias, motivos(p), pendientes(p));
    }

    /** Un examen por fila (sus paralelos juntos), sin los cancelados. */
    private List<FilaExamen> examenesDelPeriodo(MapSqlParameterSource p) {
        return jdbc.query("""
                SELECT x.id_examen, x.fecha, MIN(x.hora_inicio), MAX(x.duracion_minutos),
                       COUNT(a.id_estudiante), COUNT(CASE WHEN a.habilitado = TRUE THEN 1 END), COUNT(a.fecha_hora_ingreso)
                FROM examen x
                LEFT JOIN asistencia_examen a ON a.id_examen = x.id_examen AND a.id_paralelo = x.id_paralelo
                WHERE x.fecha BETWEEN :desde AND :hasta AND (x.estado IS NULL OR LOWER(x.estado) <> 'cancelado')
                GROUP BY x.id_examen, x.fecha
                """, p, (rs, i) -> {
            LocalDate fecha = rs.getDate(2).toLocalDate();
            Time hora = rs.getTime(3);
            LocalDateTime inicio = fecha.atTime(hora.toLocalTime());
            return new FilaExamen(rs.getInt(1), fecha, inicio, inicio.plusMinutes(rs.getInt(4)),
                    rs.getInt(5), rs.getInt(6), rs.getInt(7));
        });
    }

    /**
     * «Incidencias → Revisar»: el detalle de las incidencias de hoy (las mismas que cuenta el contador),
     * de la más reciente a la más antigua.
     */
    @Transactional(readOnly = true)
    public List<com.nexacore.examenes.dto.IncidenciaHoyResponse> incidenciasDeHoy() {
        LocalDate hoy = asistenciaExamenRepository.obtenerFechaHoraServidor().toLocalDate();
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("inicioHoy", Timestamp.valueOf(hoy.atStartOfDay()))
                .addValue("finHoy", Timestamp.valueOf(hoy.plusDays(1).atStartOfDay()))
                .addValue("marca", MARCA_EXCEPCION);
        return jdbc.query("""
                SELECT i.tipo, i.fecha_hora, i.id_examen,
                       m.nombre || COALESCE(' · ' || pa.nombre_grupo, '') AS examen,
                       CASE WHEN es.id_estudiante IS NULL THEN NULL ELSE es.nombre || ' ' || es.apellidos END AS estudiante,
                       i.detalle
                FROM (
                    SELECT 'EXPULSION' AS tipo, fecha_hora, id_examen, id_estudiante, motivo AS detalle FROM expulsion
                        WHERE fecha_hora >= :inicioHoy AND fecha_hora < :finHoy AND anulada_en IS NULL
                    UNION ALL SELECT 'INTENTO_INCORRECTO', fecha_hora, id_examen, id_estudiante, observacion FROM intento_ingreso
                        WHERE fecha_hora >= :inicioHoy AND fecha_hora < :finHoy AND (observacion IS NULL OR observacion NOT LIKE :marca)
                    UNION ALL SELECT 'EXCEPCION', fecha_hora, id_examen, id_estudiante, COALESCE(observaciones, motivo_inhabilitacion)
                        FROM excepcion_no_habilitado WHERE fecha_hora >= :inicioHoy AND fecha_hora < :finHoy
                    UNION ALL SELECT 'INGRESO_MANUAL', fecha_hora, id_examen, id_estudiante, justificacion_manual FROM registro_control_ingreso
                        WHERE tipo_ingreso = 'MANUAL' AND fecha_hora >= :inicioHoy AND fecha_hora < :finHoy
                    UNION ALL SELECT 'TRASLADO', t.fecha_hora_traslado, t.id_examen, t.id_estudiante,
                           COALESCE(ao.nombre, '?') || ' → ' || COALESCE(ad.nombre, '?') || COALESCE(' · ' || t.motivo, '')
                        FROM traslado_ambiente t
                        LEFT JOIN ambiente ao ON ao.id_ambiente = t.id_ambiente_origen
                        LEFT JOIN ambiente ad ON ad.id_ambiente = t.id_ambiente_destino
                        WHERE t.fecha_hora_traslado >= :inicioHoy AND t.fecha_hora_traslado < :finHoy
                    UNION ALL SELECT 'QR_DUPLICADO', fecha_hora_servidor, id_examen, id_estudiante_qr, detalle FROM reporte_qr_duplicado
                        WHERE fecha_hora_servidor >= :inicioHoy AND fecha_hora_servidor < :finHoy
                ) i
                JOIN examen ex ON ex.id_examen = i.id_examen
                JOIN materia m ON m.id_materia = ex.id_materia
                LEFT JOIN paralelo pa ON pa.id_paralelo = ex.id_paralelo
                LEFT JOIN estudiante es ON es.id_estudiante = i.id_estudiante
                ORDER BY i.fecha_hora DESC
                """, p, (rs, n) -> new com.nexacore.examenes.dto.IncidenciaHoyResponse(rs.getString(1),
                rs.getTimestamp(2).toLocalDateTime(), rs.getInt(3), rs.getString(4), rs.getString(5), rs.getString(6)));
    }

    /** Las mismas incidencias que cuenta el control del examen (DASH-01), por día. */
    private void incidenciasPorDia(MapSqlParameterSource p, Map<LocalDate, int[]> dias) {
        jdbc.query("""
                SELECT dia, COUNT(*) FROM (
                    SELECT CAST(fecha_hora AS DATE) AS dia FROM expulsion WHERE fecha_hora >= :desdeHora AND anulada_en IS NULL
                    UNION ALL SELECT CAST(fecha_hora AS DATE) FROM intento_ingreso
                        WHERE fecha_hora >= :desdeHora AND (observacion IS NULL OR observacion NOT LIKE :marca)
                    UNION ALL SELECT CAST(fecha_hora AS DATE) FROM excepcion_no_habilitado WHERE fecha_hora >= :desdeHora
                    UNION ALL SELECT CAST(fecha_hora AS DATE) FROM registro_control_ingreso
                        WHERE tipo_ingreso = 'MANUAL' AND fecha_hora >= :desdeHora
                    UNION ALL SELECT CAST(fecha_hora_traslado AS DATE) FROM traslado_ambiente WHERE fecha_hora_traslado >= :desdeHora
                    UNION ALL SELECT CAST(fecha_hora_servidor AS DATE) FROM reporte_qr_duplicado WHERE fecha_hora_servidor >= :desdeHora
                ) i GROUP BY dia
                """, p, rs -> {
            int[] d = dias.get(rs.getDate(1).toLocalDate());
            if (d != null) d[3] += rs.getInt(2);
        });
    }

    /** "Ambiente incorrecto: ..." lleva el aula en el texto: se juntan todos en un solo motivo. */
    private List<InicioAdminResponse.Motivo> motivos(MapSqlParameterSource p) {
        String motivo = "CASE WHEN observacion LIKE 'Ambiente incorrecto%' THEN '" + AULA_INCORRECTA
                + "' ELSE COALESCE(observacion, 'Sin motivo') END";
        String sql = "SELECT " + motivo + " AS motivo, COUNT(*) AS cantidad FROM intento_ingreso"
                + " WHERE fecha_hora >= :desdeHora AND (observacion IS NULL OR observacion NOT LIKE :marca)"
                + " GROUP BY " + motivo + " ORDER BY cantidad DESC, motivo";
        List<InicioAdminResponse.Motivo> todos = jdbc.query(sql, p,
                (rs, i) -> new InicioAdminResponse.Motivo(rs.getString(1), rs.getInt(2)));
        if (todos.size() <= MAX_MOTIVOS) return todos;
        List<InicioAdminResponse.Motivo> top = new ArrayList<>(todos.subList(0, MAX_MOTIVOS - 1));
        top.add(new InicioAdminResponse.Motivo(OTROS,
                todos.subList(MAX_MOTIVOS - 1, todos.size()).stream().mapToInt(InicioAdminResponse.Motivo::cantidad).sum()));
        return top;
    }

    /** Fotos por revisar: las que mira Revisión de fotos (cambios pendientes y fotos reportadas). */
    private InicioAdminResponse.Pendientes pendientes(MapSqlParameterSource p) {
        MapSqlParameterSource q = new MapSqlParameterSource(p.getValues())
                .addValue("pendiente", EstudianteFotoSolicitud.PENDIENTE)
                .addValue("abierto", ReporteFoto.ABIERTO);
        Integer fotos = jdbc.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT id_estudiante FROM estudiante_foto_solicitud WHERE estado = :pendiente
                    UNION SELECT id_estudiante FROM reporte_foto WHERE estado = :abierto
                ) f
                """, q, Integer.class);
        Integer qr = jdbc.queryForObject("SELECT COUNT(*) FROM reporte_qr_duplicado WHERE estado = 'PENDIENTE'", q, Integer.class);
        Integer intentos = jdbc.queryForObject("""
                SELECT COUNT(*) FROM intento_ingreso
                WHERE fecha_hora >= :inicioHoy AND fecha_hora < :finHoy AND (observacion IS NULL OR observacion NOT LIKE :marca)
                """, q, Integer.class);
        return new InicioAdminResponse.Pendientes(fotos == null ? 0 : fotos, qr == null ? 0 : qr, intentos == null ? 0 : intentos);
    }
}
