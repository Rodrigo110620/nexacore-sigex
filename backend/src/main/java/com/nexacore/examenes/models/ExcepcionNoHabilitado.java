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
 * INCI-04: excepción registrada cuando un estudiante no habilitado intenta ingresar al examen
 * (V39). El motivo de inhabilitación se copia al momento del intento, así el historial no cambia
 * si después se lo habilita. La fecha y hora la pone el servidor (DEFAULT NOW()).
 */
@Getter
@Setter
@Entity
@Table(name = "excepcion_no_habilitado")
public class ExcepcionNoHabilitado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_excepcion", nullable = false)
    private Integer id;

    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    /** Solo id_examen (único): no cambia si el examen se mueve de paralelo. */
    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    /** Ambiente donde ocurrió el intento. */
    @Column(name = "id_ambiente", nullable = false)
    private Integer idAmbiente;

    /** Personal de control autenticado que registró la excepción. */
    @Column(name = "id_usuario_control", nullable = false)
    private Integer idUsuarioControl;

    @Column(name = "motivo_inhabilitacion", nullable = false, length = 255)
    private String motivoInhabilitacion;

    @Column(name = "accion_tomada", nullable = false, length = 100)
    private String accionTomada;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    /** Hora del servidor: la asigna la base al insertar. */
    @Column(name = "fecha_hora", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaHora;
}
