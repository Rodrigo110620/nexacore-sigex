package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * "Limpiar todas" de un usuario (V46): ya no ve las notificaciones con id hasta {@code hastaId};
 * las nuevas le siguen llegando. Una fila por usuario.
 */
@Getter
@Setter
@Entity
@Table(name = "notificacion_limpieza")
public class NotificacionLimpieza {

    @Id
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "hasta_id", nullable = false)
    private Integer hastaId;

    @Column(name = "limpiada_en", nullable = false)
    private LocalDateTime limpiadaEn;
}
