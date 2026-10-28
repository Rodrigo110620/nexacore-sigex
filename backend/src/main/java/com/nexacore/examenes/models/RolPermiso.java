package com.nexacore.examenes.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

/** Un permiso de un rol extra (V48). Los roles del sistema tienen los suyos fijos en el código. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "rol_permiso")
@IdClass(RolPermiso.Id.class)
public class RolPermiso {

    @jakarta.persistence.Id
    @Column(name = "id_rol", nullable = false)
    private Integer idRol;

    @jakarta.persistence.Id
    @Column(name = "codigo_permiso", nullable = false, length = 40)
    private String codigoPermiso;

    public RolPermiso(Integer idRol, String codigoPermiso) {
        this.idRol = idRol;
        this.codigoPermiso = codigoPermiso;
    }

    public static class Id implements Serializable {
        private Integer idRol;
        private String codigoPermiso;

        public Id() {
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Id other && Objects.equals(idRol, other.idRol) && Objects.equals(codigoPermiso, other.codigoPermiso);
        }

        @Override
        public int hashCode() {
            return Objects.hash(idRol, codigoPermiso);
        }
    }
}
