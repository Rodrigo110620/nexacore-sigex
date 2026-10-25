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
 * INCI-03: traslado de un estudiante a otro ambiente durante el examen (V44). La hora la pone la
 * base (NOW()): después de guardar, recargar la entidad para leer fechaHoraTraslado.
 */
@Getter
@Setter
@Entity
@Table(name = "traslado_ambiente")
public class TrasladoAmbiente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_traslado", nullable = false)
    private Integer id;

    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @Column(name = "id_ambiente_origen", nullable = false)
    private Integer idAmbienteOrigen;

    @Column(name = "id_ambiente_destino", nullable = false)
    private Integer idAmbienteDestino;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    /** ADMIN que hizo el traslado. */
    @Column(name = "id_usuario_admin", nullable = false)
    private Integer idUsuarioAdmin;

    /** Hora del servidor; la asigna la base. */
    @Column(name = "fecha_hora_traslado", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaHoraTraslado;

    /** Comentario libre opcional del ADMIN. */
    @Column(name = "observacion", length = 1000)
    private String observacion;
}
