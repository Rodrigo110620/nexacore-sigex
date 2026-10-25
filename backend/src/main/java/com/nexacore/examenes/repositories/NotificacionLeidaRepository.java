package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.NotificacionLeida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;

public interface NotificacionLeidaRepository extends JpaRepository<NotificacionLeida, NotificacionLeida.Id> {

    @Query("""
            SELECT l.id.idNotificacion FROM NotificacionLeida l
            WHERE l.id.idUsuario = :idUsuario AND l.id.idNotificacion IN :ids
            """)
    Set<Integer> leidasDe(@Param("idUsuario") Integer idUsuario, @Param("ids") Collection<Integer> ids);
}
