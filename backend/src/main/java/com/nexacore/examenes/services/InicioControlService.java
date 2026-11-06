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

    static final int RECIENTES = 8;
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
        int intentos = contar("SELECT COUNT(*) FROM intento_ingreso WHERE id_usuario_control = :yo AND fecha_hora >= :desde AND fecha_hora < :hasta"
                + " AND (observacion IS NULL OR observacion NOT LIKE :marca)", p);
        int fotos = contar("SELECT COUNT(*) FROM reporte_foto WHERE id_usuario = :yo AND creado_en >= :desde AND creado_en < :hasta", p);
        int qr = contar("SELECT COUNT(*) FROM reporte_qr_duplicado WHERE id_usuario_control = :yo AND fecha_hora_servidor >= :desde AND fecha_hora_servidor < :hasta", p);
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
        return new InicioControlResponse(ahora, ingresos[0], ingresos[1], intentos, fotos, qr, expulsiones, porHora, recientes);
    }

    private int contar(String sql, MapSqlParameterSource p) {
        Integer n = jdbc.queryForObject(sql, p, Integer.class);
        return n == null ? 0 : n;
    }
}
