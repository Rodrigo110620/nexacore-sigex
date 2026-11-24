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
public class MateriaCarreraId implements Serializable {
    @Serial
    private static final long serialVersionUID = 4120897712340016301L;

    @Column(name = "id_materia", nullable = false)
    private Integer idMateria;

    @Column(name = "id_carrera", nullable = false)
    private Integer idCarrera;
}
