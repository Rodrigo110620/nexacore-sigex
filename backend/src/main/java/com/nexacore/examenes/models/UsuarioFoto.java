package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Foto de perfil opcional del personal (V54). La lee y la guarda UsuarioFotoService. */
@Getter
@Setter
@Entity
@Table(name = "usuario_foto")
public class UsuarioFoto {
    @Id
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "contenido", nullable = false)
    private byte[] contenido;

    @Column(name = "tipo_contenido", nullable = false, length = 40)
    private String tipoContenido;

    @Column(name = "actualizada_en", nullable = false)
    private LocalDateTime actualizadaEn;
}
