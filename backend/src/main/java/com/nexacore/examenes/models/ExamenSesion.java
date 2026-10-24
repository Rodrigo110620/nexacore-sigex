package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Sesión anterior de un examen reprogramado (V41). Se escribe con SQL en SesionExamenService. */
@Getter
@Setter
@Entity
@Table(name = "examen_sesion")
public class ExamenSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sesion", nullable = false)
    private Integer id;

    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @Column(name = "numero", nullable = false)
    private Integer numero;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "duracion_minutos", nullable = false)
    private Integer duracionMinutos;

    @Column(name = "id_ambiente")
    private Integer idAmbiente;

    @Column(name = "asociados", nullable = false)
    private Integer asociados;

    @Column(name = "ingresaron", nullable = false)
    private Integer ingresaron;

    @Column(name = "motivo_reprogramacion", nullable = false, length = 200)
    private String motivoReprogramacion;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "cerrada_en", nullable = false)
    private LocalDateTime cerradaEn;
}
