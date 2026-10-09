package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class EstudianteCarreraId implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @NotNull
    @Column(name = "id_carrera", nullable = false)
    private Integer idCarrera;

    @NotNull
    @Column(name = "id_facultad", nullable = false)
    private Integer idFacultad;
}
