package com.nexacore.examenes.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "estudiante")
public class Estudiante {
    @EmbeddedId
    private com.nexacore.examenes.models.EstudianteId id;

    @MapsId("idUsuario")
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private com.nexacore.examenes.models.Usuario idUsuario;

    @NotNull
    @Column(name = "codigo_sis", nullable = false, length = Integer.MAX_VALUE)
    private String codigoSis;


}
