package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.LocalDateTime;

/**
 * INCI-01: expulsión de un estudiante durante el examen (V43). La hora efectiva la pone la base y
 * no se puede modificar: después de guardar, recargar la entidad para leer fechaHora.
 */
@Getter
@Setter
@Entity
@Table(name = "expulsion")
public class Expulsion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_expulsion", nullable = false)
    private Integer id;

    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    /** ADMIN que registró la expulsión. */
    @Column(name = "id_usuario_responsable", nullable = false)
    private Integer idUsuarioResponsable;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    /** Hora del servidor; la asigna la base y es inmutable. */
    @Column(name = "fecha_hora", nullable = false, insertable = false, updatable = false)
    @Generated(event = EventType.INSERT, sql = "clock_timestamp()")
    private LocalDateTime fechaHora;
}
