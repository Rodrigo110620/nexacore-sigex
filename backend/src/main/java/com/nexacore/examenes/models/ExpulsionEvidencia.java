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

/** Una foto o captura que respalda una expulsión (V55). La guarda y la lee ExpulsionEvidenciaService. */
@Getter
@Setter
@Entity
@Table(name = "expulsion_evidencia")
public class ExpulsionEvidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_evidencia")
    private Integer id;

    @Column(name = "id_expulsion", nullable = false)
    private Integer idExpulsion;

    @Column(name = "contenido", nullable = false)
    private byte[] contenido;

    @Column(name = "tipo_contenido", nullable = false, length = 40)
    private String tipoContenido;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "subida_en", nullable = false)
    private LocalDateTime subidaEn;
}
