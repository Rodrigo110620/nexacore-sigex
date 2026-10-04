package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.RegistroControlIngreso;
import com.nexacore.examenes.models.RegistroControlIngresoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RegistroControlIngresoRepository
        extends JpaRepository<RegistroControlIngreso, RegistroControlIngresoId> {

    List<RegistroControlIngreso> findByIdIdExamenAndIdIdParaleloOrderByFechaHoraAsc(
            Integer idExamen, Integer idParalelo);

    List<RegistroControlIngreso> findByIdIdEstudianteAndIdIdExamenOrderByFechaHoraDesc(
            Integer idEstudiante, Integer idExamen);

    @Query(value = """
            SELECT r.id_control, r.id_estudiante,
                   CONCAT(e.nombre, ' ', e.apellidos), e.codigo_sis, r.resultado_autorizacion,
                   r.motivo_denegacion, r.observaciones,
                   CONCAT(u.nombre, ' ', u.apellidos), r.fecha_hora
            FROM registro_control_ingreso r
            JOIN estudiante e ON e.id_estudiante = r.id_estudiante
            JOIN usuario u ON u.id_usuario = r.id_usuario_control
            WHERE r.id_examen = :idExamen
            ORDER BY r.fecha_hora DESC, r.id_control DESC
            """, nativeQuery = true)
    List<Object[]> listarPorExamen(@Param("idExamen") Integer idExamen);

    @Modifying
    @Query(value = """
            INSERT INTO registro_control_ingreso
                (id_examen, id_paralelo, id_estudiante, id_usuario_control,
                 resultado_autorizacion, motivo_denegacion, verificaciones_adicionales, observaciones)
            VALUES
                (:idExamen, :idParalelo, :idEstudiante, :idUsuarioControl,
                 :resultado, :motivo, CAST(:verificaciones AS jsonb), :observaciones)
            """, nativeQuery = true)
    void registrar(
            @Param("idExamen") Integer idExamen,
            @Param("idParalelo") Integer idParalelo,
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("resultado") String resultado,
            @Param("motivo") String motivo,
            @Param("verificaciones") String verificaciones,
            @Param("observaciones") String observaciones);
}
