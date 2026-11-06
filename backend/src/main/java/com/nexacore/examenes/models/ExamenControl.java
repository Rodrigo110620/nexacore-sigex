package com.nexacore.examenes.models;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Un usuario del personal de control asignado a un examen (V53). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "examen_control")
public class ExamenControl {

    @EmbeddedId
    private ExamenControlId id;

    public ExamenControl(Integer idExamen, Integer idUsuario) {
        this.id = new ExamenControlId(idExamen, idUsuario);
    }
}
