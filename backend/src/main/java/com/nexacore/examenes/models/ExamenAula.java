package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Aula adicional de un examen. La principal es examen.id_ambiente (orden 0);
 * las adicionales se llenan en el orden indicado (1, 2, ...).
 */
@Getter
@Setter
@Entity
@Table(name = "examen_aula")
public class ExamenAula {

    @EmbeddedId
    private ExamenAulaId id;

    @Column(name = "orden", nullable = false)
    private Short orden;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_ambiente", referencedColumnName = "id_ambiente", insertable = false, updatable = false)
    private Ambiente ambiente;
}
