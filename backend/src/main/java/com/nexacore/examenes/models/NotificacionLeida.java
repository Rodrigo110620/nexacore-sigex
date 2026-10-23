package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/** Marca de que un usuario ya leyó una notificación (V40). */
@Getter
@Setter
@Entity
@Table(name = "notificacion_leida")
public class NotificacionLeida {

    @EmbeddedId
    private Id id;

    @Column(name = "leida_en", nullable = false)
    private LocalDateTime leidaEn;

    @Getter
    @Setter
    @EqualsAndHashCode
    @Embeddable
    public static class Id implements Serializable {
        @Column(name = "id_notificacion", nullable = false)
        private Integer idNotificacion;

        @Column(name = "id_usuario", nullable = false)
        private Integer idUsuario;
    }
}
