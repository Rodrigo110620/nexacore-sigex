package com.nexacore.examenes.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "rol")
public class Rol {
    /** Rol de la cuenta de un estudiante. No es un rol de personal: no se asigna desde Usuarios. */
    public static final String ESTUDIANTE = "ESTUDIANTE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "nombre", nullable = false, length = Integer.MAX_VALUE)
    private String nombre;

}
