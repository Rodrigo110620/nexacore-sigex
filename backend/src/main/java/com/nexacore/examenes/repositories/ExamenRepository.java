package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExamenRepository extends JpaRepository<Examen, ExamenId> {

    List<Examen> findAllByOrderByFechaDescHoraInicioDesc();

    List<Examen> findByIdDocenteOrderByFechaDescHoraInicioDesc(Integer idDocente);

    @Query("""
            SELECT COUNT(e) > 0 FROM Examen e
            WHERE e.id.idExamen = :idExamen AND e.idDocente = :idDocente
            """)
    boolean perteneceADocente(@Param("idExamen") Integer idExamen, @Param("idDocente") Integer idDocente);

    /** Nombre de la materia del examen, para el texto de las notificaciones. */
    @Query("""
            SELECT m.nombre FROM Examen e JOIN e.paralelo p JOIN p.materia m
            WHERE e.id.idExamen = :idExamen
            """)
    List<String> nombreMateria(@Param("idExamen") Integer idExamen);

    /** id_examen es único por sí solo (uq_id_examen), aunque la PK incluya id_paralelo. */
    boolean existsByIdIdExamen(Integer idExamen);

    /** Exámenes vigentes (no cancelados) de una fecha, para calcular la disponibilidad de todas las aulas. */
    @Query("""
            SELECT e FROM Examen e
            WHERE e.fecha = :fecha AND COALESCE(e.estado, 'programado') <> 'cancelado'
            """)
    List<Examen> findVigentesEnFecha(@Param("fecha") LocalDate fecha);

    /**
     * Exámenes vigentes que ocupan el ambiente en la fecha, como aula principal o adicional;
     * los cancelados ya no lo ocupan.
     */
    @Query("""
            SELECT e FROM Examen e
            WHERE e.fecha = :fecha
              AND COALESCE(e.estado, 'programado') <> 'cancelado'
              AND (e.idAmbiente = :idAmbiente OR EXISTS (
                    SELECT 1 FROM ExamenAula ea
                    WHERE ea.id.idExamen = e.id.idExamen AND ea.id.idAmbiente = :idAmbiente))
            """)
    List<Examen> findByAmbienteAndFecha(
            @Param("idAmbiente") Integer idAmbiente,
            @Param("fecha") LocalDate fecha);

    java.util.Optional<Examen> findFirstByIdIdExamen(Integer idExamen);

    /** Exámenes vigentes (no cancelados) del grupo en la fecha: un grupo no rinde dos exámenes a la vez. */
    @Query("""
            SELECT e FROM Examen e
            WHERE e.fecha = :fecha AND e.id.idParalelo = :idParalelo
              AND COALESCE(e.estado, 'programado') <> 'cancelado'
            """)
    List<Examen> delParaleloEnFecha(@Param("idParalelo") Integer idParalelo, @Param("fecha") LocalDate fecha);

    /**
     * Exámenes conjuntos anteriores (de id menor): misma materia, mismo docente, otro grupo, misma fecha, hora y
     * duración, no cancelados. Comparten aulas: el de id menor llena primero (BUG-B02).
     */
    @Query("""
            SELECT e FROM Examen e
            WHERE e.idMateria = :idMateria AND e.idDocente = :idDocente AND e.fecha = :fecha
              AND e.horaInicio = :horaInicio AND e.duracionMinutos = :duracion
              AND e.id.idExamen < :idExamen
              AND COALESCE(e.estado, 'programado') <> 'cancelado'
            ORDER BY e.id.idExamen
            """)
    List<Examen> conjuntosAnteriores(@Param("idMateria") Integer idMateria, @Param("idDocente") Integer idDocente,
                                     @Param("fecha") LocalDate fecha, @Param("horaInicio") java.time.LocalTime horaInicio,
                                     @Param("duracion") Integer duracion, @Param("idExamen") Integer idExamen);
}
