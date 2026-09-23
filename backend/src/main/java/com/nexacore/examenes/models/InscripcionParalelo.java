package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "inscripcion_paralelo")
public class InscripcionParalelo {

    @EmbeddedId
    private InscripcionParaleloId id;

    @NotNull
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_estudiante", referencedColumnName = "id_estudiante", insertable = false, updatable = false),
        @JoinColumn(name = "id_usuario", referencedColumnName = "id_usuario", insertable = false, updatable = false)
    })
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_paralelo", referencedColumnName = "id_paralelo", insertable = false, updatable = false),
        @JoinColumn(name = "id_materia", referencedColumnName = "id_materia", insertable = false, updatable = false),
        @JoinColumn(name = "id_docente", referencedColumnName = "id_docente", insertable = false, updatable = false)
    })
    private Paralelo paralelo;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "fecha_inscripcion")
    private Instant fechaInscripcion;

    @ColumnDefault("'inscrito'")
    @Column(name = "estado")
    private String estado;
}
