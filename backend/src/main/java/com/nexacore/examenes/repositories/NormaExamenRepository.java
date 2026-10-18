package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.NormaExamen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface NormaExamenRepository extends JpaRepository<NormaExamen, Integer> {

    /** Activas y eliminadas, en el orden en que se registraron. */
    List<NormaExamen> findByIdExamenOrderByIdAsc(Integer idExamen);

    List<NormaExamen> findByIdExamenAndActivaTrueOrderByIdAsc(Integer idExamen);

    /** Normas activas de varios exámenes, para armar un listado con una sola consulta. */
    List<NormaExamen> findByIdExamenInAndActivaTrueOrderByIdAsc(Collection<Integer> idsExamen);

    /** Al quitar a un estudiante del examen, sus normas particulares dejan de aplicar. */
    @Modifying
    @Query("""
            UPDATE NormaExamen n SET n.activa = false, n.eliminadaEn = :ahora
            WHERE n.idExamen = :idExamen AND n.idEstudiante = :idEstudiante AND n.activa = true
            """)
    int desactivarDelEstudiante(@Param("idExamen") Integer idExamen,
                                @Param("idEstudiante") Integer idEstudiante,
                                @Param("ahora") LocalDateTime ahora);
}
