package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Paralelo;
import com.nexacore.examenes.models.ParaleloId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ParaleloRepository extends JpaRepository<Paralelo, ParaleloId> {

    @Query("SELECT p FROM Paralelo p WHERE p.id.idParalelo IN :ids")
    java.util.List<Paralelo> findAllByIdParalelos(@Param("ids") java.util.Collection<Integer> ids);

    /** Los grupos del docente en la materia (puede tener G1, G2…), por nombre. */
    @Query("""
            SELECT p FROM Paralelo p
            WHERE p.id.idMateria = :idMateria AND p.id.idDocente = :idDocente
            ORDER BY p.nombreGrupo
            """)
    java.util.List<Paralelo> deMateriaYDocente(
            @Param("idMateria") Integer idMateria,
            @Param("idDocente") Integer idDocente);
}
