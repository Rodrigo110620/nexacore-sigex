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
public class IncidenciaId implements Serializable {
    @Serial
    private static final long serialVersionUID = -1412895675071992319L;
    @NotNull
    @ColumnDefault("nextval('incidencia_id_incidencia_seq')")
    @Column(name = "id_incidencia", nullable = false)
    private Integer idIncidencia;

    @NotNull
    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @NotNull
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @NotNull
    @Column(name = "id_usuario_control", nullable = false)
    private Integer idUsuarioControl;

    @NotNull
    @Column(name = "id_tipo_incidencia", nullable = false)
    private Integer idTipoIncidencia;


}
