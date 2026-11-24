package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Una sesión iniciada por un usuario, con su navegador y dispositivo (V62). */
@Getter
@Setter
@Entity
@Table(name = "sesion_usuario")
public class SesionUsuario {

    @Id
    @Column(name = "id_sesion", nullable = false, length = 36)
    private String id;

    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "dispositivo", nullable = false, length = 120)
    private String dispositivo;

    @Column(name = "ip", length = 64)
    private String ip;

    @Column(name = "iniciada_en", nullable = false)
    private LocalDateTime iniciadaEn;

    @Column(name = "ultima_actividad", nullable = false)
    private LocalDateTime ultimaActividad;

    @Column(name = "cerrada_en")
    private LocalDateTime cerradaEn;

    @Column(name = "motivo_cierre", length = 40)
    private String motivoCierre;
}
