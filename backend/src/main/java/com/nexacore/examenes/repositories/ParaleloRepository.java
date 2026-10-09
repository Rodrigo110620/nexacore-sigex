package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Paralelo;
import com.nexacore.examenes.models.ParaleloId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ParaleloRepository extends JpaRepository<Paralelo, ParaleloId> {

    @Query("""
            SELECT p FROM Paralelo p
            WHERE p.id.idMateria = :idMateria AND p.id.idDocente = :idDocente
            """)
    Optional<Paralelo> findFirstByMateriaAndDocente(
            @Param("idMateria") Integer idMateria,
            @Param("idDocente") Integer idDocente);
}
