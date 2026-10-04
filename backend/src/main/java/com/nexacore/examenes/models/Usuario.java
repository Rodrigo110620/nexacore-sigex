package com.nexacore.examenes.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "usuario")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario", nullable = false)
    private Integer id;

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

    @NotNull
    @Column(name = "password", nullable = false, length = Integer.MAX_VALUE)
    private String password;

    @ColumnDefault("'activo'")
    @Column(name = "estado", length = Integer.MAX_VALUE)
    private String estado;

    /** Intentos de login fallidos seguidos; vuelve a 0 al entrar o al bloquearse la cuenta. */
    @ColumnDefault("0")
    @Column(name = "intentos_fallidos", nullable = false)
    private int intentosFallidos;

    /** Fin del bloqueo temporal por intentos fallidos, o null si la cuenta no está bloqueada. */
    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @JsonIgnore
    @OneToMany(mappedBy = "idUsuario", fetch = FetchType.LAZY)
    private List<UsuarioRol> usuarioRoles;

}
