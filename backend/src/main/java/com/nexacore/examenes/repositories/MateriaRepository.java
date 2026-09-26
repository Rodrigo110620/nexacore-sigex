package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Materia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MateriaRepository extends JpaRepository<Materia, Integer> {
    Optional<Materia> findByNombreIgnoreCase(String nombre);
    Optional<Materia> findBySiglaIgnoreCase(String sigla);
}
