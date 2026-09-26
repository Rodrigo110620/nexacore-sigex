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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "registro_control_ingreso")
public class RegistroControlIngreso {

    @EmbeddedId
    private RegistroControlIngresoId id;

    @NotNull
    @Column(name = "id_usuario_control", nullable = false)
    private Integer idUsuarioControl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_examen", referencedColumnName = "id_examen", insertable = false, updatable = false),
        @JoinColumn(name = "id_paralelo", referencedColumnName = "id_paralelo", insertable = false, updatable = false)
    })
    private Examen examen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({
        @JoinColumn(name = "id_estudiante", referencedColumnName = "id_estudiante", insertable = false, updatable = false),
        @JoinColumn(name = "id_usuario", referencedColumnName = "id_usuario", insertable = false, updatable = false)
    })
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario_control", referencedColumnName = "id_usuario", insertable = false, updatable = false)
    private Usuario usuarioControl;

    @NotNull
    @Column(name = "resultado_autorizacion", nullable = false)
    private String resultadoAutorizacion;

    @Column(name = "motivo_denegacion")
    private String motivoDenegacion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "verificaciones_adicionales")
    private String verificacionesAdicionales;

    @Column(name = "observaciones")
    private String observaciones;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "fecha_hora", nullable = false)
    private Instant fechaHora;
}
