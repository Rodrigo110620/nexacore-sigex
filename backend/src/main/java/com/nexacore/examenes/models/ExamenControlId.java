package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class ExamenControlId implements Serializable {

    @Column(name = "id_examen")
    private Integer idExamen;

    @Column(name = "id_usuario")
    private Integer idUsuario;
}
