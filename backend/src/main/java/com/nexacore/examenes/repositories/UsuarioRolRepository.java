package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, UsuarioRolId> {
}
