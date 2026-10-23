package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Reporte del personal de control: la foto aprobada no coincide con la persona que se presentó.
 * Mientras está ABIERTO el estudiante debe volver a escanear su rostro; se cierra cuando la
 * administración aprueba la nueva foto o descarta el reporte.
 */
@Getter
@Setter
@Entity
@Table(name = "reporte_foto")
public class ReporteFoto {
    public static final String ABIERTO = "ABIERTO";
    public static final String RESUELTO = "RESUELTO";
    public static final String APROBADA = "APROBADA";
    public static final String DESCARTADO = "DESCARTADO";

    /** La persona no se parece a la foto / la foto no es clara o está desactualizada / otro motivo. */
    public enum Motivo { NO_SE_PARECE, NO_CLARA, OTRO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reporte", nullable = false)
    private Integer id;

    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    /** Usuario del personal que reportó. */
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    /** Examen en cuyo control de ingreso se reportó, si se conoce. */
    @Column(name = "id_examen")
    private Integer idExamen;

    @Column(name = "motivo", nullable = false, length = 20)
    private String motivo;

    @Column(name = "detalle", length = 200)
    private String detalle;

    @Column(name = "estado", nullable = false, length = 10)
    private String estado = ABIERTO;

    @Column(name = "resolucion", length = 12)
    private String resolucion;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @Column(name = "resuelto_en")
    private LocalDateTime resueltoEn;
}
