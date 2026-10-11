package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Fotografía del estudiante (una por estudiante), separada para no cargarla con sus datos. */
@Getter
@Setter
@Entity
@Table(name = "estudiante_foto")
public class EstudianteFoto {

    @Id
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @Column(name = "contenido", nullable = false)
    private byte[] contenido;

    @Column(name = "tipo_contenido", nullable = false, length = 30)
    private String tipoContenido;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;
}
