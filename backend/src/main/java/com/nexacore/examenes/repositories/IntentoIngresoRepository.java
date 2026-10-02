package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.IntentoIngreso;
import com.nexacore.examenes.models.IntentoIngresoId;
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

    @Query(value = """
            SELECT i.id_intento, i.id_examen, i.id_estudiante,
                   CONCAT(e.nombre, ' ', e.apellidos), e.codigo_sis, i.ci_o_codigo,
                   i.observacion, CONCAT(u.nombre, ' ', u.apellidos), i.fecha_hora
            FROM intento_ingreso i
            LEFT JOIN estudiante e ON e.id_estudiante = i.id_estudiante
            JOIN usuario u ON u.id_usuario = i.id_usuario_control
            WHERE i.id_examen = :idExamen
              AND (:idEstudiante IS NULL OR i.id_estudiante = :idEstudiante)
            ORDER BY i.fecha_hora DESC, i.id_intento DESC
            """, nativeQuery = true)
    List<Object[]> listar(@Param("idExamen") Integer idExamen, @Param("idEstudiante") Integer idEstudiante);
}
