package com.nexacore.examenes.models;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Carrera que cursa un estudiante; un estudiante puede tener varias. */
@Getter
@Setter
@Entity
@Table(name = "estudiante_carrera")
public class EstudianteCarrera {

    @EmbeddedId
    private EstudianteCarreraId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_estudiante", referencedColumnName = "id_estudiante", insertable = false, updatable = false)
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_carrera", referencedColumnName = "id_carrera", insertable = false, updatable = false),
        @JoinColumn(name = "id_facultad", referencedColumnName = "id_facultad", insertable = false, updatable = false)
    })
    private Carrera carrera;
}
