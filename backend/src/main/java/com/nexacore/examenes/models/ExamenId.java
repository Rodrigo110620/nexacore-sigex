package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class ExamenId implements Serializable {
    @Serial
    private static final long serialVersionUID = 2646394156474341961L;
    @NotNull
    @ColumnDefault("nextval('examen_id_examen_seq')")
    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @NotNull
    @Column(name = "id_paralelo", nullable = false)
    private Integer idParalelo;


}
