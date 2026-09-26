package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Ambiente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AmbienteRepository extends JpaRepository<Ambiente, Integer> {
    boolean existsByNombreIgnoreCase(String nombre);
    Optional<Ambiente> findByNombreIgnoreCase(String nombre);
    List<Ambiente> findAllByOrderByNombreAsc();
}
