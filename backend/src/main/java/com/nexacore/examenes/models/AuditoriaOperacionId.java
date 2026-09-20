package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class AuditoriaOperacionId implements Serializable {
    @Serial
    private static final long serialVersionUID = -3200021663541794826L;
    @NotNull
    @ColumnDefault("nextval('auditoria_operacion_id_auditoria_seq')")
    @Column(name = "id_auditoria", nullable = false)
    private Integer idAuditoria;

    @NotNull
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;


}
