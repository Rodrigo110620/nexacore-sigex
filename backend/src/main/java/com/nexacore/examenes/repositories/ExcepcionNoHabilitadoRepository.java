package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ExcepcionNoHabilitado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExcepcionNoHabilitadoRepository extends JpaRepository<ExcepcionNoHabilitado, Integer> {

    /** Reporte de excepciones de un examen, de la más reciente a la más antigua. */
    List<ExcepcionNoHabilitado> findByIdExamenOrderByFechaHoraDesc(Integer idExamen);

    List<ExcepcionNoHabilitado> findByIdExamenAndFechaHoraAfterOrderByFechaHoraDesc(Integer idExamen, java.time.LocalDateTime desde);

    /**
     * Reporte de la sesión actual del examen: si se reprogramó, las excepciones anteriores quedan en el
     * historial (igual que las expulsiones). Sin reprogramar (ultimoCierre null) cuenta todas.
     */
    default List<ExcepcionNoHabilitado> deSesionActual(Integer idExamen, java.time.LocalDateTime ultimoCierre) {
        return findByIdExamenAndFechaHoraAfterOrderByFechaHoraDesc(idExamen,
                ultimoCierre == null ? java.time.LocalDateTime.of(2000, 1, 1, 0, 0) : ultimoCierre);
    }

    /** Excepciones de un estudiante en un examen. */
    List<ExcepcionNoHabilitado> findByIdEstudianteAndIdExamenOrderByFechaHoraDesc(Integer idEstudiante, Integer idExamen);
}
