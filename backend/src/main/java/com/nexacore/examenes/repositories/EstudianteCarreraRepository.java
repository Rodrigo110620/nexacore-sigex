package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.models.EstudianteCarreraId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface EstudianteCarreraRepository extends JpaRepository<EstudianteCarrera, EstudianteCarreraId> {

    /**
     * Devuelve las carreras (con su facultad) de un estudiante.
     * Usado para el detalle del estudiante en el listado.
     */
    @Query("""
        SELECT ec FROM EstudianteCarrera ec
        JOIN FETCH ec.carrera c
        JOIN FETCH c.facultad
        WHERE ec.id.idEstudiante = :idEstudiante
        """)
    List<EstudianteCarrera> findByEstudianteId(@Param("idEstudiante") Integer idEstudiante);

    /** Todas las carreras de todos los estudiantes, con su facultad. Para la planilla de estudiantes. */
    @Query("""
        SELECT ec FROM EstudianteCarrera ec
        JOIN FETCH ec.carrera c
        JOIN FETCH c.facultad
        """)
    List<EstudianteCarrera> findAllConCarreraYFacultad();

    /** Carreras (con su facultad) de varios estudiantes en una sola consulta. */
    @Query("""
        SELECT ec FROM EstudianteCarrera ec
        JOIN FETCH ec.carrera c
        JOIN FETCH c.facultad
        WHERE ec.id.idEstudiante IN :idsEstudiante
        """)
    List<EstudianteCarrera> findByEstudianteIds(@Param("idsEstudiante") Collection<Integer> idsEstudiante);
}
