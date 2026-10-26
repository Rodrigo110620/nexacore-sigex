package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.EstudianteFoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;

public interface EstudianteFotoRepository extends JpaRepository<EstudianteFoto, Integer> {

    /** De estos estudiantes, los que tienen foto registrada (sin cargar las imágenes). */
    @Query("SELECT f.idEstudiante FROM EstudianteFoto f WHERE f.idEstudiante IN :ids")
    Set<Integer> conFoto(@Param("ids") Collection<Integer> ids);
}
