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
public class InscripcionParaleloId implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @NotNull
    @Column(name = "id_paralelo", nullable = false)
    private Integer idParalelo;

    @NotNull
    @Column(name = "id_materia", nullable = false)
    private Integer idMateria;

    @NotNull
    @Column(name = "id_docente", nullable = false)
    private Integer idDocente;
}
