package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Incidencia;
import com.nexacore.examenes.models.IncidenciaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface IncidenciaRepository extends JpaRepository<Incidencia, IncidenciaId> {
    @Modifying
    @Query(value = """
            INSERT INTO incidencia
                (id_examen, id_estudiante, id_usuario_control, id_tipo_incidencia,
                 id_paralelo, descripcion, fecha_hora)
            VALUES
                (:idExamen, :idEstudiante, :idUsuarioControl, :idTipoIncidencia,
                 :idParalelo, :descripcion, :fechaHora)
            """, nativeQuery = true)
    void registrar(
            @Param("idExamen") Integer idExamen,
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("idTipoIncidencia") Integer idTipoIncidencia,
            @Param("idParalelo") Integer idParalelo,
            @Param("descripcion") String descripcion,
            @Param("fechaHora") LocalDateTime fechaHora);

    /**
     * Incidencias del estudiante en el examen: [fecha_hora, nombre del tipo, descripción].
     * Se registran en la misma transacción que su control, así que comparten la fecha y hora.
     */
    @Query(value = """
            SELECT i.fecha_hora, c.nombre, i.descripcion
            FROM incidencia i
            JOIN catalogo_incidencia c ON c.id_tipo_incidencia = i.id_tipo_incidencia
            WHERE i.id_estudiante = :idEstudiante AND i.id_examen = :idExamen
            ORDER BY i.id_incidencia
            """, nativeQuery = true)
    List<Object[]> listarDelControl(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen);

    /**
     * Incidencias de todo el examen en una sola consulta: [id_estudiante, fecha_hora, nombre del tipo,
     * descripción]. El reporte de ingresos las reparte en memoria en vez de consultar por estudiante.
     */
    @Query(value = """
            SELECT i.id_estudiante, i.fecha_hora, c.nombre, i.descripcion
            FROM incidencia i
            JOIN catalogo_incidencia c ON c.id_tipo_incidencia = i.id_tipo_incidencia
            WHERE i.id_examen = :idExamen
            ORDER BY i.id_incidencia
            """, nativeQuery = true)
    List<Object[]> listarDelExamen(@Param("idExamen") Integer idExamen);
}
