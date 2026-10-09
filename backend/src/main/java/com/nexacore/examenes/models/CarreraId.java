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
public class CarreraId implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    @ColumnDefault("nextval('carrera_id_carrera_seq')")
    @Column(name = "id_carrera", nullable = false)
    private Integer idCarrera;

    @NotNull
    @Column(name = "id_facultad", nullable = false)
    private Integer idFacultad;
}
