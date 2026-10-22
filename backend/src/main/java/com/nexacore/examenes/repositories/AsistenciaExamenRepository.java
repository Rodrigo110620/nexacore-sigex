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
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AsistenciaExamenRepository extends JpaRepository<AsistenciaExamen, AsistenciaExamenId> {
    String CONSULTA_CONTEXTO = """
            SELECT a FROM AsistenciaExamen a
            JOIN FETCH a.estudiante e
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
            SET fecha_hora_ingreso = :fechaHoraIngreso,
                id_ambiente_ingreso = :idAmbiente,
                id_usuario_control = :idUsuarioControl,
                observaciones_control = :observaciones
            WHERE id_estudiante = :idEstudiante
              AND id_examen = :idExamen
              AND fecha_hora_ingreso IS NULL
            """, nativeQuery = true)
    int autorizarConHoraDispositivo(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen,
            @Param("idAmbiente") Integer idAmbiente,
            @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("observaciones") String observaciones,
            @Param("fechaHoraIngreso") LocalDateTime fechaHoraIngreso);

    /** Conservado para compatibilidad; las nuevas autorizaciones usan la hora del dispositivo. */
    @Deprecated
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE asistencia_examen SET fecha_hora_ingreso = NOW(), id_ambiente_ingreso = :idAmbiente,
                id_usuario_control = :idUsuarioControl, observaciones_control = :observaciones
            WHERE id_estudiante = :idEstudiante AND id_examen = :idExamen AND fecha_hora_ingreso IS NULL
            """, nativeQuery = true)
    int autorizarConFechaServidor(@Param("idEstudiante") Integer idEstudiante, @Param("idExamen") Integer idExamen,
            @Param("idAmbiente") Integer idAmbiente, @Param("idUsuarioControl") Integer idUsuarioControl,
            @Param("observaciones") String observaciones);

    @Query(value = "SELECT fecha_hora_ingreso FROM asistencia_examen WHERE id_estudiante = :idEstudiante AND id_examen = :idExamen", nativeQuery = true)
    LocalDateTime obtenerFechaHoraIngreso(
            @Param("idEstudiante") Integer idEstudiante,
            @Param("idExamen") Integer idExamen);

    /** Estudiantes asociados al examen, ordenados por apellidos y nombre (pestaña de habilitación). */
    @Query("""
            SELECT a FROM AsistenciaExamen a
            JOIN FETCH a.estudiante e
            WHERE a.id.idExamen = :idExamen AND a.idParalelo = :idParalelo
            ORDER BY e.apellidos, e.nombre, e.id
            """)
    List<AsistenciaExamen> listarDelExamen(
            @Param("idExamen") Integer idExamen,
            @Param("idParalelo") Integer idParalelo);

    /** Ids de los estudiantes ya asociados al examen. */
    @Query("SELECT a.id.idEstudiante FROM AsistenciaExamen a WHERE a.id.idExamen = :idExamen")
    List<Integer> idsEstudiantesDelExamen(@Param("idExamen") Integer idExamen);

    @Query("""
            SELECT a FROM AsistenciaExamen a
            WHERE a.id.idExamen = :idExamen AND a.idParalelo = :idParalelo
              AND a.id.idEstudiante IN :idsEstudiante
            """)
    List<AsistenciaExamen> buscarDelExamen(
            @Param("idExamen") Integer idExamen,
            @Param("idParalelo") Integer idParalelo,
            @Param("idsEstudiante") Collection<Integer> idsEstudiante);

    /** Examen del mismo día de un estudiante, con lo necesario para ver si se cruza en horario. */
    record OtroExamen(Integer idEstudiante, java.time.LocalTime horaInicio, Integer duracionMinutos,
                      String estado, String sigla, String materia) {}

    /** Otros exámenes del mismo día de estos estudiantes, para avisar cruces de horario (MAST-04). */
    @Query("""
            SELECT new com.nexacore.examenes.repositories.AsistenciaExamenRepository$OtroExamen(
                   a.id.idEstudiante, ex.horaInicio, ex.duracionMinutos, ex.estado, m.sigla, m.nombre)
            FROM AsistenciaExamen a
            JOIN a.examen ex
            JOIN ex.paralelo p
            JOIN p.materia m
            WHERE a.id.idEstudiante IN :idsEstudiante
              AND ex.fecha = :fecha
              AND a.id.idExamen <> :idExamen
            """)
    List<OtroExamen> otrosExamenesDelDia(@Param("idsEstudiante") Collection<Integer> idsEstudiante,
                                               @Param("fecha") java.time.LocalDate fecha,
                                               @Param("idExamen") Integer idExamen);

    /** Registros del control de ingreso del estudiante en el examen (autorizaciones, intentos, incidencias). */
    @Query(value = """
            SELECT (SELECT COUNT(*) FROM registro_control_ingreso WHERE id_examen = :idExamen AND id_estudiante = :idEstudiante)
                 + (SELECT COUNT(*) FROM intento_ingreso WHERE id_examen = :idExamen AND id_estudiante = :idEstudiante)
                 + (SELECT COUNT(*) FROM incidencia WHERE id_examen = :idExamen AND id_estudiante = :idEstudiante)
            """, nativeQuery = true)
    long contarRegistrosDeControl(@Param("idExamen") Integer idExamen, @Param("idEstudiante") Integer idEstudiante);

    /** Exámenes de un estudiante, del más próximo al más lejano (panel del estudiante). */
    @Query("""
            SELECT a FROM AsistenciaExamen a
            JOIN FETCH a.examen ex
            JOIN FETCH ex.paralelo p
            JOIN FETCH p.materia
            LEFT JOIN FETCH ex.ambiente
            LEFT JOIN FETCH a.ambienteIngreso
            WHERE a.id.idEstudiante = :idEstudiante
            ORDER BY ex.fecha, ex.horaInicio
            """)
    List<AsistenciaExamen> listarDelEstudiante(@Param("idEstudiante") Integer idEstudiante);

    @Query(value = "SELECT LOCALTIMESTAMP", nativeQuery = true)
    LocalDateTime obtenerFechaHoraServidor();
}
