package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Incidencia;
import com.nexacore.examenes.models.IncidenciaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface IncidenciaRepository extends JpaRepository<Incidencia, IncidenciaId> {
    @Modifying
    @Query(value = """
            INSERT INTO incidencia
                (id_examen, id_estudiante, id_usuario_control, id_tipo_incidencia,
                 id_usuario, id_paralelo, descripcion, fecha_hora)
            VALUES
                (:idExamen, :idEstudiante, :idUsuarioControl, :idTipoIncidencia,
                 :idUsuario, :idParalelo, :descripcion, :fechaHora)
            """, nativeQuery = true)
    void registrar(
            @Param("idExamen") Integer idExamen,
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("idTipoIncidencia") Integer idTipoIncidencia,
            @Param("idUsuario") Integer idUsuario,
            @Param("idParalelo") Integer idParalelo,
            @Param("descripcion") String descripcion,
            @Param("fechaHora") LocalDateTime fechaHora);
}
