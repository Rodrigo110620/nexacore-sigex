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

    @Modifying
    @Query(value = """
            INSERT INTO registro_control_ingreso
                (id_examen, id_paralelo, id_estudiante, id_usuario, id_usuario_control,
                 resultado_autorizacion, motivo_denegacion, verificaciones_adicionales, observaciones)
            VALUES
                (:idExamen, :idParalelo, :idEstudiante, :idUsuario, :idUsuarioControl,
                 :resultado, :motivo, CAST(:verificaciones AS jsonb), :observaciones)
            """, nativeQuery = true)
    void registrar(
            @Param("idExamen") Integer idExamen,
            @Param("idParalelo") Integer idParalelo,
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idUsuario") Integer idUsuario,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("resultado") String resultado,
            @Param("motivo") String motivo,
            @Param("verificaciones") String verificaciones,
            @Param("observaciones") String observaciones);
}
