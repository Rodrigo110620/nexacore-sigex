package com.nexacore.examenes.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "materia")
public class Materia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_materia", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "sigla", nullable = false)
    private String sigla;

    @NotNull
    @Column(name = "nombre", nullable = false)
    private String nombre;

    /** V64: una materia desactivada no se ofrece para programar exámenes ni asignar a docentes; su historial queda. */
    @org.hibernate.annotations.ColumnDefault("true")
    @Column(name = "activa", nullable = false)
    private boolean activa = true;


}
