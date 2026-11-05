package com.nexacore.examenes.models;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** IMP-12: una materia asignada a un docente (V51). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "docente_materia")
public class DocenteMateria {

    @EmbeddedId
    private DocenteMateriaId id;

    public DocenteMateria(Integer idDocente, Integer idMateria) {
        this.id = new DocenteMateriaId(idDocente, idMateria);
    }
}
