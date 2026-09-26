package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Docente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocenteRepository extends JpaRepository<Docente, Integer> {

    @Query("""
            SELECT d FROM Docente d
            JOIN d.usuario u
            WHERE LOWER(CONCAT(u.nombre, ' ', u.apellidos)) LIKE LOWER(CONCAT('%', :texto, '%'))
            """)
    List<Docente> findByNombreCompletoContaining(@Param("texto") String texto);
}
