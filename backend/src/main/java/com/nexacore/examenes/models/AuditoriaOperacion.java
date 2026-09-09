package com.nexacore.examenes.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "auditoria_operacion")
public class AuditoriaOperacion {
    @EmbeddedId
    private com.nexacore.examenes.models.AuditoriaOperacionId id;

    @MapsId("idUsuario")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private com.nexacore.examenes.models.Usuario idUsuario;

    @NotNull
    @Column(name = "accion", nullable = false, length = Integer.MAX_VALUE)
    private String accion;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "fecha_hora")
    private Instant fechaHora;

    @Column(name = "detalles", length = Integer.MAX_VALUE)
    private String detalles;


}
