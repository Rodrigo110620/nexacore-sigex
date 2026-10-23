package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ExcepcionNoHabilitado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExcepcionNoHabilitadoRepository extends JpaRepository<ExcepcionNoHabilitado, Integer> {

    /** Reporte de excepciones de un examen, de la más reciente a la más antigua. */
    List<ExcepcionNoHabilitado> findByIdExamenOrderByFechaHoraDesc(Integer idExamen);

    /** Excepciones de un estudiante en un examen. */
    List<ExcepcionNoHabilitado> findByIdEstudianteAndIdExamenOrderByFechaHoraDesc(Integer idEstudiante, Integer idExamen);
}
