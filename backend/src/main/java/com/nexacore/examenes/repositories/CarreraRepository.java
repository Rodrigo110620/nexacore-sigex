package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Carrera;
import com.nexacore.examenes.models.CarreraId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CarreraRepository extends JpaRepository<Carrera, CarreraId> {

    List<Carrera> findAllByOrderByNombreAsc();

    List<Carrera> findByIdIdFacultadOrderByNombreAsc(Integer idFacultad);

    Optional<Carrera> findByNombreIgnoreCase(String nombre);
}
