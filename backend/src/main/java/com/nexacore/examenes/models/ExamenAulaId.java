package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
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
@Embeddable
public class ExamenAulaId implements Serializable {
    @Serial
    private static final long serialVersionUID = 7312094471820553214L;

    @NotNull
    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @NotNull
    @Column(name = "id_ambiente", nullable = false)
    private Integer idAmbiente;

    public ExamenAulaId(Integer idExamen, Integer idAmbiente) {
        this.idExamen = idExamen;
        this.idAmbiente = idAmbiente;
    }
}
