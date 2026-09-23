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
@Table(name = "intento_ingreso")
public class IntentoIngreso {

    @EmbeddedId
    private IntentoIngresoId id;

    @NotNull
    @Column(name = "id_usuario_control", nullable = false)
    private Integer idUsuarioControl;

    /** CI, código SIS u otro identificador presentado en el control. */
    @NotNull
    @Column(name = "ci_o_codigo", nullable = false, length = Integer.MAX_VALUE)
    private String ciOCodigo;

    @Column(name = "id_estudiante")
    private Integer idEstudiante;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_examen", referencedColumnName = "id_examen", insertable = false, updatable = false),
        @JoinColumn(name = "id_paralelo", referencedColumnName = "id_paralelo", insertable = false, updatable = false)
    })
    private Examen examen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario_control", referencedColumnName = "id_usuario", insertable = false, updatable = false)
    private Usuario usuarioControl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "id_estudiante", referencedColumnName = "id_estudiante", insertable = false, updatable = false),
        @JoinColumn(name = "id_usuario", referencedColumnName = "id_usuario", insertable = false, updatable = false)
    })
    private Estudiante estudiante;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "fecha_hora")
    private Instant fechaHora;

    @Column(name = "observacion", length = Integer.MAX_VALUE)
    private String observacion;
}
