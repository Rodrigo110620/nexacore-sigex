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

/** Notificación de un reporte del control de ingreso (V40). */
@Getter
@Setter
@Entity
@Table(name = "notificacion")
public class Notificacion {

    /** Tipos de reporte que generan notificación. */
    public static final String FOTO_REPORTADA = "FOTO_REPORTADA";
    public static final String QR_DUPLICADO = "QR_DUPLICADO";
    public static final String INTENTO_INGRESO = "INTENTO_INGRESO";
    public static final String AULA_INCORRECTA = "AULA_INCORRECTA";
    /** INCI-04: excepción registrada para un estudiante no habilitado. */
    public static final String EXCEPCION_NO_HABILITADO = "EXCEPCION_NO_HABILITADO";
    /** INCI-01: expulsión de un estudiante durante el examen. */
    public static final String EXPULSION = "EXPULSION";
    /** INCI-02: ingreso manual por excepción. */
    public static final String INGRESO_MANUAL = "INGRESO_MANUAL";
    /** INCI-03: traslado de un estudiante a otra aula durante el examen. */
    public static final String TRASLADO_AMBIENTE = "TRASLADO_AMBIENTE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_notificacion", nullable = false)
    private Integer id;

    @Column(name = "tipo", nullable = false, length = 40)
    private String tipo;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    @Column(name = "detalle", length = 500)
    private String detalle;

    @Column(name = "id_examen")
    private Integer idExamen;

    @Column(name = "id_estudiante")
    private Integer idEstudiante;

    @Column(name = "enlace", length = 300)
    private String enlace;

    @Column(name = "id_autor")
    private Integer idAutor;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;
}
