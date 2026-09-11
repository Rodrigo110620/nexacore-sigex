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
@Table(name = "asistencia_examen")
public class AsistenciaExamen {

    @EmbeddedId
    private AsistenciaExamenId id;

    @NotNull
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @NotNull
    @Column(name = "id_paralelo", nullable = false)
    private Integer idParalelo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_estudiante", referencedColumnName = "id_estudiante", insertable = false, updatable = false),
        @JoinColumn(name = "id_usuario", referencedColumnName = "id_usuario", insertable = false, updatable = false)
    })
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_examen", referencedColumnName = "id_examen", insertable = false, updatable = false),
        @JoinColumn(name = "id_paralelo", referencedColumnName = "id_paralelo", insertable = false, updatable = false)
    })
    private Examen examen;

    @ColumnDefault("true")
    @Column(name = "habilitado")
    private Boolean habilitado;

    @Column(name = "motivo_inhabilitacion")
    private String motivoInhabilitacion;

    @Column(name = "fecha_hora_ingreso")
    private Instant fechaHoraIngreso;

    @Column(name = "ambiente_ingreso")
    private String ambienteIngreso;
}
