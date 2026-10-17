package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Foto que subió el propio estudiante. La que ve el personal de control (EstudianteFoto) no cambia
 * hasta que la administración aprueba esta solicitud.
 */
@Getter
@Setter
@Entity
@Table(name = "estudiante_foto_solicitud")
public class EstudianteFotoSolicitud {
    public static final String PENDIENTE = "PENDIENTE";
    public static final String RECHAZADA = "RECHAZADA";

    @Id
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @Column(name = "contenido", nullable = false)
    private byte[] contenido;

    @Column(name = "tipo_contenido", nullable = false, length = 30)
    private String tipoContenido;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = PENDIENTE;

    @Column(name = "motivo_rechazo", length = 200)
    private String motivoRechazo;

    @Column(name = "enviada_en", nullable = false)
    private LocalDateTime enviadaEn;

    @Column(name = "revisada_en")
    private LocalDateTime revisadaEn;
}
