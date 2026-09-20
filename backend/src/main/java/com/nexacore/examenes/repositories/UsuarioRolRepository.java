package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, UsuarioRolId> {
    @Modifying
    @Transactional
    @Query("DELETE FROM UsuarioRol ur WHERE ur.id.idUsuario = :idUsuario")
    void deleteByUsuarioId(@Param("idUsuario") Integer idUsuario); // Asegúrate de que reciba Integer igual que tu ID
}