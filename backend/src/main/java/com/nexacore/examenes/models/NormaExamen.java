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
 * Norma de un examen (V34). GENERAL aplica a todos; PARTICULAR, a un estudiante. Las eliminadas
 * quedan con activa = false como historial.
 */
@Getter
@Setter
@Entity
@Table(name = "norma_examen")
public class NormaExamen {
    public static final String GENERAL = "GENERAL";
    public static final String PARTICULAR = "PARTICULAR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_norma", nullable = false)
    private Integer id;

    /** Solo id_examen (único): no cambia si el examen se mueve de paralelo. */
    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @Column(name = "tipo", nullable = false, length = 10)
    private String tipo;

    @Column(name = "id_estudiante")
    private Integer idEstudiante;

    /** Nombre con el que se registró; las normas antiguas solo tienen el nombre. */
    @Column(name = "nombre_estudiante", length = 200)
    private String nombreEstudiante;

    @Column(name = "texto", nullable = false, columnDefinition = "text")
    private String texto;

    @Column(name = "activa", nullable = false)
    private boolean activa = true;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    @Column(name = "eliminada_en")
    private LocalDateTime eliminadaEn;

    public boolean esParticular() {
        return PARTICULAR.equals(tipo);
    }
}
