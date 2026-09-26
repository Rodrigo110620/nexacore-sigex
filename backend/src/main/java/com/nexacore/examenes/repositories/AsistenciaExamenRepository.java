package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.AsistenciaExamenId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AsistenciaExamenRepository extends JpaRepository<AsistenciaExamen, AsistenciaExamenId> {
    String CONSULTA_CONTEXTO = """
            SELECT a FROM AsistenciaExamen a
            JOIN FETCH a.estudiante e
            JOIN FETCH e.idUsuario
            JOIN FETCH a.examen x
            JOIN FETCH x.paralelo p
            JOIN FETCH p.materia
            JOIN FETCH x.ambiente
            WHERE a.id.idEstudiante = :idEstudiante AND a.id.idExamen = :idExamen
            """;

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(CONSULTA_CONTEXTO)
    Optional<AsistenciaExamen> buscarParaAutorizar(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen);

    @Query(CONSULTA_CONTEXTO)
    Optional<AsistenciaExamen> buscarContexto(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE asistencia_examen
            SET fecha_hora_ingreso = NOW(),
                id_ambiente_ingreso = :idAmbiente,
                id_usuario_control = :idUsuarioControl,
                observaciones_control = :observaciones
            WHERE id_estudiante = :idEstudiante
              AND id_examen = :idExamen
              AND fecha_hora_ingreso IS NULL
            """, nativeQuery = true)
    int autorizarConFechaServidor(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen,
            @Param("idAmbiente") Integer idAmbiente,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("observaciones") String observaciones);

    @Query(value = "SELECT fecha_hora_ingreso FROM asistencia_examen WHERE id_estudiante = :idEstudiante AND id_examen = :idExamen", nativeQuery = true)
    LocalDateTime obtenerFechaHoraIngreso(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen);

    @Query(value = "SELECT LOCALTIMESTAMP", nativeQuery = true)
    LocalDateTime obtenerFechaHoraServidor();
}
