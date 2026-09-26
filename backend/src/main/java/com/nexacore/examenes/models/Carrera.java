package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Catálogo de carreras por facultad (MAST-01).
 * PK compuesta {@code (id_carrera, id_facultad)} — mismo patrón que paralelo.
 */
@Getter
@Setter
@Entity
@Table(name = "carrera")
public class Carrera {

    @EmbeddedId
    private CarreraId id;

    @MapsId("idFacultad")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_facultad", nullable = false)
    private Facultad facultad;

    @NotNull
    @Column(name = "nombre", nullable = false, length = Integer.MAX_VALUE)
    private String nombre;

    @Column(name = "codigo", length = Integer.MAX_VALUE)
    private String codigo;
}
