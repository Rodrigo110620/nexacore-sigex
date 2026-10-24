package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Materia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MateriaRepository extends JpaRepository<Materia, Integer> {
    Optional<Materia> findByNombreIgnoreCase(String nombre);
    Optional<Materia> findBySiglaIgnoreCase(String sigla);

    @Query("""
            SELECT m FROM Materia m
            WHERE CAST(FUNCTION('translate', LOWER(m.nombre), 'áéíóúàèìòùäëïöüâêîôûñ', 'aeiouaeiouaeiouaeioun') AS String)
                    LIKE CONCAT('%', :q, '%')
               OR LOWER(m.sigla) LIKE CONCAT('%', :q, '%')
            ORDER BY m.nombre
            """)
    /** q sin tildes y en minúsculas (TextoBusqueda.sinTildes): "fisic" encuentra "Física". */
    List<Materia> buscar(@Param("q") String q);
}
