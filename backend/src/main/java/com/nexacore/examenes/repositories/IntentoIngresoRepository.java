package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.IntentoIngreso;
import com.nexacore.examenes.models.IntentoIngresoId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IntentoIngresoRepository extends JpaRepository<IntentoIngreso, IntentoIngresoId> {
    @Modifying
    @Query(value = """
            INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, id_estudiante, observacion)
            SELECT e.id_examen, e.id_paralelo, :idControl, :identificador, :idEstudiante, :motivo
            FROM examen e WHERE e.id_examen = :idExamen
            """, nativeQuery = true)
    int registrar(@Param("idExamen") Integer idExamen, @Param("idEstudiante") Integer idEstudiante,
                 @Param("idControl") Integer idControl, @Param("identificador") String identificador,
                 @Param("motivo") String motivo);

    /** Evita duplicados generados por un doble clic o retransmisión inmediata. */
    @Query(value = """
            SELECT EXISTS (
                SELECT 1 FROM intento_ingreso
                WHERE id_examen = :idExamen
                  AND id_estudiante = :idEstudiante
                  AND fecha_hora >= CURRENT_TIMESTAMP - INTERVAL '30 seconds'
            )
            """, nativeQuery = true)
    boolean existeRegistroReciente(@Param("idExamen") Integer idExamen,
                                   @Param("idEstudiante") Integer idEstudiante);

    @Query(value = """
            SELECT i.id_intento, i.id_examen, i.id_estudiante,
                   CAST(CONCAT(e.nombre, ' ', e.apellidos) AS VARCHAR), CAST(e.codigo_sis AS VARCHAR),
                   CAST(i.ci_o_codigo AS VARCHAR), CAST(i.observacion AS VARCHAR),
                   CAST(CONCAT(u.nombre, ' ', u.apellidos) AS VARCHAR), i.fecha_hora
            FROM intento_ingreso i
            LEFT JOIN estudiante e ON e.id_estudiante = i.id_estudiante
            JOIN usuario u ON u.id_usuario = i.id_usuario_control
            WHERE i.id_examen = :idExamen
              AND (:idEstudiante IS NULL OR i.id_estudiante = :idEstudiante)
            ORDER BY i.fecha_hora DESC, i.id_intento DESC
            """, nativeQuery = true)
    List<Object[]> listar(@Param("idExamen") Integer idExamen, @Param("idEstudiante") Integer idEstudiante);

    /**
     * DASH-06 / HU#7: todos los intentos incorrectos, del más reciente al más antiguo, con el examen al
     * que intentaron ingresar. Con idExamen, solo los de ese examen desde su último cierre de sesión
     * (desde = null cuenta todos).
     */
    @Query(value = """
            SELECT i.id_intento, i.id_examen, CAST(m.nombre AS VARCHAR), x.fecha, x.hora_inicio, i.id_estudiante,
                   CAST(CONCAT(e.nombre, ' ', e.apellidos) AS VARCHAR), CAST(e.codigo_sis AS VARCHAR),
                   CAST(i.ci_o_codigo AS VARCHAR), CAST(i.observacion AS VARCHAR),
                   CAST(CONCAT(u.nombre, ' ', u.apellidos) AS VARCHAR), i.fecha_hora
            FROM intento_ingreso i
            JOIN examen x ON x.id_examen = i.id_examen AND x.id_paralelo = i.id_paralelo
            LEFT JOIN materia m ON m.id_materia = x.id_materia
            LEFT JOIN estudiante e ON e.id_estudiante = i.id_estudiante
            JOIN usuario u ON u.id_usuario = i.id_usuario_control
            WHERE (CAST(:idExamen AS INTEGER) IS NULL OR i.id_examen = CAST(:idExamen AS INTEGER))
              AND (CAST(:desde AS TIMESTAMP) IS NULL OR i.fecha_hora > CAST(:desde AS TIMESTAMP))
            ORDER BY i.fecha_hora DESC, i.id_intento DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM intento_ingreso i
            WHERE (CAST(:idExamen AS INTEGER) IS NULL OR i.id_examen = CAST(:idExamen AS INTEGER))
              AND (CAST(:desde AS TIMESTAMP) IS NULL OR i.fecha_hora > CAST(:desde AS TIMESTAMP))
            """,
            nativeQuery = true)
    Page<Object[]> reporte(@Param("idExamen") Integer idExamen, @Param("desde") java.time.LocalDateTime desde,
                           Pageable pageable);
}
