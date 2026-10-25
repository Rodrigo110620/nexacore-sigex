package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Notificacion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Integer> {

    /**
     * Para ADMIN y CONTROL: todas, de la más reciente a la más antigua. Sin las que el usuario
     * limpió (V46): las de id hasta {@code desde} y las que quitó una por una.
     */
    @Query("""
            SELECT n FROM Notificacion n
            WHERE n.id > :desde
              AND NOT EXISTS (SELECT 1 FROM NotificacionLeida l
                              WHERE l.id.idNotificacion = n.id AND l.id.idUsuario = :idUsuario AND l.oculta = true)
            ORDER BY n.id DESC
            """)
    List<Notificacion> visibles(@Param("idUsuario") Integer idUsuario, @Param("desde") Integer desde, Pageable pagina);

    /** Para un DOCENTE: solo las de sus exámenes, sin las que limpió. */
    @Query("""
            SELECT n FROM Notificacion n
            WHERE n.idExamen IN (SELECT e.id.idExamen FROM Examen e WHERE e.idDocente = :idDocente)
              AND n.id > :desde
              AND NOT EXISTS (SELECT 1 FROM NotificacionLeida l
                              WHERE l.id.idNotificacion = n.id AND l.id.idUsuario = :idDocente AND l.oculta = true)
            ORDER BY n.id DESC
            """)
    List<Notificacion> deDocente(@Param("idDocente") Integer idDocente, @Param("desde") Integer desde, Pageable pagina);

    /** La notificación más reciente (para "Limpiar todas"). */
    @Query("SELECT max(n.id) FROM Notificacion n")
    Integer ultimoId();
}
