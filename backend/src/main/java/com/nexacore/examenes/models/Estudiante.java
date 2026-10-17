package com.nexacore.examenes.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

/**
 * Estudiante. No inicia sesión, por eso no es un usuario del sistema:
 * guarda sus propios datos personales.
 */
@Getter
@Setter
@Entity
@Table(name = "estudiante")
public class Estudiante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estudiante", nullable = false)
    private Integer id;

    @NotNull
    @Size(min = 9, max = 9)
    @Pattern(regexp = "^\\d{9}$")
    @Column(name = "codigo_sis", nullable = false, length = Integer.MAX_VALUE)
    private String codigoSis;

    @Column(name = "telefono", length = 8)
    private String telefono;

    @NotNull
    @Column(name = "nombre", nullable = false, length = Integer.MAX_VALUE)
    private String nombre;

    @NotNull
    @Column(name = "apellidos", nullable = false, length = Integer.MAX_VALUE)
    private String apellidos;

    @NotNull
    @Column(name = "ci", nullable = false, length = Integer.MAX_VALUE)
    private String ci;

    @NotNull
    @Column(name = "email", nullable = false, length = Integer.MAX_VALUE)
    private String email;

    /** Condición o tipo de estudiante: REGULAR o POSTULANTE (ver CondicionEstudiante). */
    @NotNull
    @ColumnDefault("'REGULAR'")
    @Column(name = "condicion", nullable = false, length = 20)
    private String condicion = CondicionEstudiante.REGULAR;

}
