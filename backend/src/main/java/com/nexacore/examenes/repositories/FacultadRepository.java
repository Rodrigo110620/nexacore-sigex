package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Facultad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FacultadRepository extends JpaRepository<Facultad, Integer> {

    List<Facultad> findAllByOrderByNombreAsc();

    Optional<Facultad> findByCodigoIgnoreCase(String codigo);
}
