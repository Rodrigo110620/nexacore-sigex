package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EstudianteRepository extends JpaRepository<Estudiante, EstudianteId> {

    @Query("""
            SELECT e FROM Estudiante e
            JOIN FETCH e.idUsuario u
            WHERE e.codigoSis = :identificador OR u.ci = :identificador
            """)
    Optional<Estudiante> findByCodigoSisOrCi(@Param("identificador") String identificador);
}
