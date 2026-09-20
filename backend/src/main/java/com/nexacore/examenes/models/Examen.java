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

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Entity
@Table(name = "examen")
public class Examen {

    @EmbeddedId
    private ExamenId id;

    @NotNull
    @Column(name = "id_materia", nullable = false)
    private Integer idMateria;

    @NotNull
    @Column(name = "id_docente", nullable = false)
    private Integer idDocente;

    /**
     * FK completa a la PK compuesta de paralelo:
     * (id_paralelo, id_materia, id_docente)
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_paralelo", referencedColumnName = "id_paralelo", insertable = false, updatable = false),
        @JoinColumn(name = "id_materia", referencedColumnName = "id_materia", insertable = false, updatable = false),
        @JoinColumn(name = "id_docente", referencedColumnName = "id_docente", insertable = false, updatable = false)
    })
    private Paralelo paralelo;

    @NotNull
    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @NotNull
    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @NotNull
    @Column(name = "duracion_minutos", nullable = false)
    private Integer duracionMinutos;

    @NotNull
    @Column(name = "ambiente_asignado", nullable = false)
    private String ambienteAsignado;

    @Column(name = "normas")
    private String normas;

    @ColumnDefault("'programado'")
    @Column(name = "estado")
    private String estado;
}
