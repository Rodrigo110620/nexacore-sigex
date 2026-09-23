package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "docente")
public class Docente {

    @Id
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "titulo", length = Integer.MAX_VALUE)
    private String titulo;

    @Column(name = "especialidad", length = Integer.MAX_VALUE)
    private String especialidad;

    /** TITULAR | INTERINO | INVITADO (régimen docente UMSS/CEUB). */
    @Column(name = "categoria", nullable = false, length = Integer.MAX_VALUE)
    private String categoria = "INTERINO";
}
