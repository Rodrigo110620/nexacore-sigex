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

}
