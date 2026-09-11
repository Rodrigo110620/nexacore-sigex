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
public class EstudianteId implements Serializable {
    @Serial
    private static final long serialVersionUID = -340800540926221047L;
    @NotNull
    @ColumnDefault("nextval('estudiante_id_estudiante_seq')")
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @NotNull
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;


}
