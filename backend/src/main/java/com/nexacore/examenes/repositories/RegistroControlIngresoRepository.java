package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.RegistroControlIngreso;
import com.nexacore.examenes.models.RegistroControlIngresoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDateTime;

public interface RegistroControlIngresoRepository
        extends JpaRepository<RegistroControlIngreso, RegistroControlIngresoId> {

    /** La autorización y su evidencia manual se confirman en la misma transacción. */
    @Modifying
    @Query(value = """
            UPDATE registro_control_ingreso SET tipo_ingreso = 'MANUAL', justificacion_manual = :justificacion
            WHERE id_control = (SELECT max(id_control) FROM registro_control_ingreso
                WHERE id_estudiante = :idEstudiante AND id_examen = :idExamen
                  AND resultado_autorizacion = 'AUTORIZADO')
              AND id_estudiante = :idEstudiante AND id_examen = :idExamen
            """, nativeQuery = true)
    void marcarIngresoManual(@Param("idEstudiante") Integer idEstudiante,
                             @Param("idExamen") Integer idExamen,
                             @Param("justificacion") String justificacion);

    List<RegistroControlIngreso> findByIdIdExamenAndIdIdParaleloOrderByFechaHoraAsc(
            Integer idExamen, Integer idParalelo);

    @Query("""
            SELECT r FROM RegistroControlIngreso r
            JOIN FETCH r.estudiante
            JOIN FETCH r.usuarioControl
            WHERE r.id.idExamen = :idExamen
            ORDER BY r.fechaHora DESC, r.id.idControl DESC
            """)
    List<RegistroControlIngreso> listarPorExamen(@Param("idExamen") Integer idExamen);

    List<RegistroControlIngreso> findByIdIdEstudianteAndIdIdExamenOrderByFechaHoraDesc(
            Integer idEstudiante, Integer idExamen);

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

    /** El historial de una autorización debe mostrar la misma hora local que el ingreso. */
    @Modifying
    @Query(value = """
            INSERT INTO registro_control_ingreso
                (id_examen, id_paralelo, id_estudiante, id_usuario_control,
                 resultado_autorizacion, motivo_denegacion, verificaciones_adicionales, observaciones, fecha_hora)
            VALUES
                (:idExamen, :idParalelo, :idEstudiante, :idUsuarioControl,
                 :resultado, :motivo, CAST(:verificaciones AS jsonb), :observaciones, :fechaHora)
            """, nativeQuery = true)
    void registrarConFecha(
            @Param("idExamen") Integer idExamen,
            @Param("idParalelo") Integer idParalelo,
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("resultado") String resultado,
            @Param("motivo") String motivo,
            @Param("verificaciones") String verificaciones,
            @Param("observaciones") String observaciones,
            @Param("fechaHora") LocalDateTime fechaHora);
}
