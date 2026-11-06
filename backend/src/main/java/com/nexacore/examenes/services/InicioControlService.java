package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.InicioControlResponse;
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
import java.util.List;

/**
 * Inicio de CONTROL: lo que registró hoy quien inició sesión (ingresos, intentos incorrectos, fotos
 * reportadas, QR duplicados y expulsiones). No incluye los registros de otros controles.
 */
@Service
public class InicioControlService {

    static final int RECIENTES = 30;
    /** La excepción de un no habilitado (INCI-04) también deja un intento: ese no se cuenta dos veces. */
    private static final String MARCA_EXCEPCION = "Intento ingresar no habilitado ###%";

    private final NamedParameterJdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final AsistenciaExamenRepository asistenciaExamenRepository;

    public InicioControlService(NamedParameterJdbcTemplate jdbc, UsuarioRepository usuarioRepository,
                                AsistenciaExamenRepository asistenciaExamenRepository) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.asistenciaExamenRepository = asistenciaExamenRepository;
    }

    @Transactional(readOnly = true)
    public InicioControlResponse misRegistros() {
        Integer yo = usuarioRepository.findByEmail(SesionActual.email()).map(Usuario::getId).orElse(-1);
        LocalDateTime ahora = asistenciaExamenRepository.obtenerFechaHoraServidor();
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("yo", yo)
                .addValue("desde", Timestamp.valueOf(ahora.toLocalDate().atStartOfDay()))
                .addValue("hasta", Timestamp.valueOf(ahora.toLocalDate().plusDays(1).atStartOfDay()))
                .addValue("marca", MARCA_EXCEPCION);

        int[] porHora = new int[24];
        int[] ingresos = new int[2];
        jdbc.query("""
                SELECT EXTRACT(HOUR FROM fecha_hora), COUNT(*), COUNT(CASE WHEN tipo_ingreso = 'MANUAL' THEN 1 END)
                FROM registro_control_ingreso
                WHERE id_usuario_control = :yo AND resultado_autorizacion = 'AUTORIZADO' AND fecha_hora >= :desde AND fecha_hora < :hasta
                GROUP BY EXTRACT(HOUR FROM fecha_hora)
                """, p, rs -> {
            porHora[rs.getInt(1)] = rs.getInt(2);
            ingresos[0] += rs.getInt(2);
            ingresos[1] += rs.getInt(3);
        });
        int[] intentosPorHora = porHora("intento_ingreso", "fecha_hora", "id_usuario_control",
                " AND (observacion IS NULL OR observacion NOT LIKE :marca)", p);
        int[] fotosPorHora = porHora("reporte_foto", "creado_en", "id_usuario", "", p);
        int[] qrPorHora = porHora("reporte_qr_duplicado", "fecha_hora_servidor", "id_usuario_control", "", p);
        int intentos = java.util.Arrays.stream(intentosPorHora).sum();
        int fotos = java.util.Arrays.stream(fotosPorHora).sum();
        int qr = java.util.Arrays.stream(qrPorHora).sum();
        int expulsiones = contar("SELECT COUNT(*) FROM expulsion WHERE id_usuario_responsable = :yo AND fecha_hora >= :desde AND fecha_hora < :hasta AND anulada_en IS NULL", p);

        List<InicioControlResponse.Registro> recientes = jdbc.query("""
                SELECT r.fecha, r.tipo, TRIM(COALESCE(e.nombre, '') || ' ' || COALESCE(e.apellidos, '')), COALESCE(e.codigo_sis, r.identificador), m.nombre
                FROM (
                    SELECT fecha_hora AS fecha, CASE WHEN tipo_ingreso = 'MANUAL' THEN 'INGRESO_MANUAL' ELSE 'INGRESO' END AS tipo,
                           id_estudiante, CAST(NULL AS VARCHAR) AS identificador, id_examen
                    FROM registro_control_ingreso
                    WHERE id_usuario_control = :yo AND resultado_autorizacion = 'AUTORIZADO' AND fecha_hora >= :desde AND fecha_hora < :hasta
                    UNION ALL
                    SELECT fecha_hora, 'INTENTO', id_estudiante, ci_o_codigo, id_examen FROM intento_ingreso
                    WHERE id_usuario_control = :yo AND fecha_hora >= :desde AND fecha_hora < :hasta AND (observacion IS NULL OR observacion NOT LIKE :marca)
                    UNION ALL
                    SELECT creado_en, 'FOTO_REPORTADA', id_estudiante, CAST(NULL AS VARCHAR), id_examen FROM reporte_foto
                    WHERE id_usuario = :yo AND creado_en >= :desde AND creado_en < :hasta
                    UNION ALL
                    SELECT fecha_hora_servidor, 'QR_DUPLICADO', id_estudiante_qr, CAST(NULL AS VARCHAR), id_examen FROM reporte_qr_duplicado
                    WHERE id_usuario_control = :yo AND fecha_hora_servidor >= :desde AND fecha_hora_servidor < :hasta
                    UNION ALL
                    SELECT fecha_hora, 'EXPULSION', id_estudiante, CAST(NULL AS VARCHAR), id_examen FROM expulsion
                    WHERE id_usuario_responsable = :yo AND fecha_hora >= :desde AND fecha_hora < :hasta AND anulada_en IS NULL
                ) r
                LEFT JOIN estudiante e ON e.id_estudiante = r.id_estudiante
                LEFT JOIN (SELECT DISTINCT x.id_examen, mt.nombre FROM examen x JOIN materia mt ON mt.id_materia = x.id_materia) m ON m.id_examen = r.id_examen
                ORDER BY r.fecha DESC
                LIMIT :limite
                """, new MapSqlParameterSource(p.getValues()).addValue("limite", RECIENTES), (rs, i) -> {
            String nombre = rs.getString(3);
            return new InicioControlResponse.Registro(rs.getTimestamp(1).toLocalDateTime(), rs.getString(2),
                    nombre == null || nombre.isBlank() ? null : nombre, rs.getString(4), rs.getString(5));
        });
        return new InicioControlResponse(ahora, ingresos[0], ingresos[1], intentos, fotos, qr, expulsiones, porHora,
                intentosPorHora, fotosPorHora, qrPorHora, recientes);
    }

    /** Registros de hoy de quien inició sesión en una tabla, por hora (las columnas son constantes del código). */
    private int[] porHora(String tabla, String fecha, String usuario, String filtro, MapSqlParameterSource p) {
        int[] horas = new int[24];
        jdbc.query("SELECT EXTRACT(HOUR FROM " + fecha + "), COUNT(*) FROM " + tabla + " WHERE " + usuario + " = :yo AND "
                + fecha + " >= :desde AND " + fecha + " < :hasta" + filtro + " GROUP BY EXTRACT(HOUR FROM " + fecha + ")", p,
                rs -> { horas[rs.getInt(1)] = rs.getInt(2); });
        return horas;
    }

    private int contar(String sql, MapSqlParameterSource p) {
        Integer n = jdbc.queryForObject(sql, p, Integer.class);
        return n == null ? 0 : n;
    }
}
