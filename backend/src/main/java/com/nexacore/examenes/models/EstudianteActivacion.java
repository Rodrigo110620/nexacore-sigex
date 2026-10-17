package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Código pendiente para activar la cuenta del estudiante (solo se guarda su hash). */
@Getter
@Setter
@Entity
@Table(name = "estudiante_activacion")
public class EstudianteActivacion {
    @Id
    @Column(name = "id_estudiante", nullable = false)
    private Integer idEstudiante;

    @Column(name = "hash_codigo", nullable = false, length = 64)
    private String hashCodigo;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(name = "intentos", nullable = false)
    private int intentos;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;
}
