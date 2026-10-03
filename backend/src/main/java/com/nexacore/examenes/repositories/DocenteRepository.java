package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Docente;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DocenteRepository extends JpaRepository<Docente, Integer> {

    @Query("""
            SELECT d FROM Docente d
            JOIN d.usuario u
            WHERE LOWER(CONCAT(u.nombre, ' ', u.apellidos)) LIKE LOWER(CONCAT('%', :texto, '%'))
            """)
    List<Docente> findByNombreCompletoContaining(@Param("texto") String texto);

    /** Docentes con su usuario ya cargado, para armar listados sin una consulta por docente. */
    @Query("SELECT d FROM Docente d JOIN FETCH d.usuario WHERE d.idUsuario IN :ids")
    List<Docente> findAllConUsuario(@Param("ids") Collection<Integer> ids);

    /** Bloquea la fila del docente hasta el fin de la transacción (ver AmbienteRepository#bloquear). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Docente d WHERE d.idUsuario = :id")
    Optional<Docente> bloquear(@Param("id") Integer id);
}
