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

    /** id_examen es único por sí solo (uq_id_examen), aunque la PK incluya id_paralelo. */
    boolean existsByIdIdExamen(Integer idExamen);

    /** Exámenes vigentes del ambiente en la fecha; los cancelados ya no ocupan el ambiente. */
    @Query("""
            SELECT e FROM Examen e
            WHERE e.idAmbiente = :idAmbiente AND e.fecha = :fecha
              AND COALESCE(e.estado, 'programado') <> 'cancelado'
            """)
    List<Examen> findByAmbienteAndFecha(
            @Param("idAmbiente") Integer idAmbiente,
            @Param("fecha") LocalDate fecha);

    /** Exámenes vigentes del docente en la fecha, para no asignarle dos a la misma hora. */
    @Query("""
            SELECT e FROM Examen e
            WHERE e.idDocente = :idDocente AND e.fecha = :fecha
              AND COALESCE(e.estado, 'programado') <> 'cancelado'
            """)
    List<Examen> findByDocenteAndFecha(
            @Param("idDocente") Integer idDocente,
            @Param("fecha") LocalDate fecha);
}
