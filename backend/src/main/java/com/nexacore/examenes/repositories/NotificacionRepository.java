package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Notificacion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Integer> {

    /** Para ADMIN y CONTROL: todas, de la más reciente a la más antigua. */
    List<Notificacion> findAllByOrderByIdDesc(Pageable pagina);

    /** Para un DOCENTE: solo las de sus exámenes. */
    @Query("""
            SELECT n FROM Notificacion n
            WHERE n.idExamen IN (SELECT e.id.idExamen FROM Examen e WHERE e.idDocente = :idDocente)
            ORDER BY n.id DESC
            """)
    List<Notificacion> deDocente(@Param("idDocente") Integer idDocente, Pageable pagina);
}
