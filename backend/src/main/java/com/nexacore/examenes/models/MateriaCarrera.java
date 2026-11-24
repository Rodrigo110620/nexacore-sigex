package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Una carrera a la que pertenece la materia: el plan de estudios (V63). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "materia_carrera")
public class MateriaCarrera {

    @EmbeddedId
    private MateriaCarreraId id;

    @Column(name = "id_facultad", nullable = false)
    private Integer idFacultad;

    public MateriaCarrera(Integer idMateria, Integer idCarrera, Integer idFacultad) {
        this.id = new MateriaCarreraId(idMateria, idCarrera);
        this.idFacultad = idFacultad;
    }
}
