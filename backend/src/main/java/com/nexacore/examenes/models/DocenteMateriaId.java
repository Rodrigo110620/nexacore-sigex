package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class DocenteMateriaId implements Serializable {
    @Serial
    private static final long serialVersionUID = 5126603957231467510L;

    @Column(name = "id_docente", nullable = false)
    private Integer idDocente;

    @Column(name = "id_materia", nullable = false)
    private Integer idMateria;
}
