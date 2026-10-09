package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Ambiente;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AmbienteRepository extends JpaRepository<Ambiente, Integer> {
    boolean existsByNombreIgnoreCase(String nombre);
    Optional<Ambiente> findByNombreIgnoreCase(String nombre);
    List<Ambiente> findAllByOrderByNombreAsc();

    /**
     * Lee el ambiente bloqueando su fila hasta el fin de la transacción, para que dos
     * registros simultáneos no pasen a la vez la validación de horario.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Ambiente a WHERE a.id = :id")
    Optional<Ambiente> bloquear(@Param("id") Integer id);
}
