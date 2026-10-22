package com.nexacore.examenes.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity
@Table(name = "reporte_qr_duplicado")
public class ReporteQrDuplicado {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reporte") private Integer id;
    @Column(name = "id_examen", nullable = false) private Integer idExamen;
    @Column(name = "id_estudiante_qr", nullable = false) private Integer idEstudianteQr;
    @Column(name = "id_usuario_control", nullable = false) private Integer idUsuarioControl;
    @Column(name = "nombres_presentado", nullable = false) private String nombresPresentado;
    @Column(name = "ci_presentado") private String ciPresentado;
    @Column(name = "presento_carnet", nullable = false) private boolean presentoCarnet = true;
    @Column(name = "codigo_sis_presentado") private String codigoSisPresentado;
    @Column(name = "detalle", nullable = false) private String detalle;
    @Column(name = "foto_contenido", nullable = false) private byte[] fotoContenido;
    @Column(name = "foto_tipo_contenido", nullable = false) private String fotoTipoContenido;
    @Column(name = "fecha_hora_dispositivo", nullable = false) private LocalDateTime fechaHoraDispositivo;
    @Column(name = "fecha_hora_servidor", nullable = false) private LocalDateTime fechaHoraServidor;
    @Column(name = "estado", nullable = false) private String estado = "PENDIENTE";
}
