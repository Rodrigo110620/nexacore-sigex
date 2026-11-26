package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.PeriodoAcademico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PeriodoAcademicoRepository extends JpaRepository<PeriodoAcademico, Integer> {

    Optional<PeriodoAcademico> findFirstByActivoTrue();

    List<PeriodoAcademico> findAllByOrderByFechaInicioDesc();

    boolean existsByNombreIgnoreCase(String nombre);

    /** Desactiva todos antes de activar otro (el índice único admite un solo activo). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE PeriodoAcademico p SET p.activo = false WHERE p.activo = true")
    int desactivarTodos();
}
