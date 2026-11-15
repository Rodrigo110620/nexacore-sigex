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

/** Una consulta a la mesa de ayuda (V57). La crea MesaAyudaService; el ADMIN la atiende. */
@Getter
@Setter
@Entity
@Table(name = "solicitud_ayuda")
public class SolicitudAyuda {
    public static final String PENDIENTE = "PENDIENTE";
    public static final String ATENDIDA = "ATENDIDA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud", nullable = false)
    private Integer id;

    @Column(name = "nombre", nullable = false, length = 120)
    private String nombre;

    @Column(name = "correo", nullable = false, length = 150)
    private String correo;

    @Column(name = "tipo", nullable = false, length = 30)
    private String tipo;

    @Column(name = "mensaje", nullable = false, length = 1000)
    private String mensaje;

    /** LOGIN (sin sesión) o PANEL (con sesión). */
    @Column(name = "origen", nullable = false, length = 20)
    private String origen;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "rol", length = 60)
    private String rol;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    @Column(name = "respuesta", length = 1000)
    private String respuesta;

    @Column(name = "id_atendida_por")
    private Integer idAtendidaPor;

    @Column(name = "atendida_en")
    private LocalDateTime atendidaEn;
}
