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
public class RegistroControlIngresoId implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @NotNull
    @Column(name = "id_paralelo", nullable = false)
    private Integer idParalelo;

    @NotNull
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @NotNull
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @NotNull
    @ColumnDefault("nextval('registro_control_ingreso_id_control_seq')")
    @Column(name = "id_control", nullable = false)
    private Integer idControl;
}
