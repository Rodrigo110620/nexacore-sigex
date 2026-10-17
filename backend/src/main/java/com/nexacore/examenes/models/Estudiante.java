package com.nexacore.examenes.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

/**
 * Estudiante. Guarda sus propios datos personales, que son la fuente oficial aunque tenga cuenta.
 * Su cuenta de usuario (rol ESTUDIANTE) es opcional: idUsuario queda null hasta que la active.
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

    /** Teléfono o celular opcional: 8 dígitos que empiezan con 5, 6 o 7. */
    @Pattern(regexp = "^[567]\\d{7}$")
    @Column(name = "telefono", length = 8)
    private String telefono;

    /** Estado de matrícula: MATRICULADO o NO_MATRICULADO (ver EstadoMatricula). */
    @NotNull
    @ColumnDefault("'MATRICULADO'")
    @Column(name = "estado_matricula", nullable = false, length = 20)
    private String estadoMatricula = EstadoMatricula.MATRICULADO;

    /** Cuenta de usuario del estudiante (rol ESTUDIANTE), o null si todavía no la activó. */
    @JsonIgnore
    @Column(name = "id_usuario", unique = true)
    private Integer idUsuario;

}
