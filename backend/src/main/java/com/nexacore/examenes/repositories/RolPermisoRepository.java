package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.RolPermiso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RolPermisoRepository extends JpaRepository<RolPermiso, RolPermiso.Id> {
    List<RolPermiso> findByIdRol(Integer idRol);

    @Modifying
    @Query("DELETE FROM RolPermiso rp WHERE rp.idRol = :idRol")
    void borrarDelRol(@Param("idRol") Integer idRol);
}
