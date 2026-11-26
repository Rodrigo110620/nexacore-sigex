package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.MateriaCarrera;
import com.nexacore.examenes.models.MateriaCarreraId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MateriaCarreraRepository extends JpaRepository<MateriaCarrera, MateriaCarreraId> {

    @Query("SELECT mc.id.idCarrera FROM MateriaCarrera mc WHERE mc.id.idMateria = :idMateria")
    List<Integer> idsCarrera(@Param("idMateria") Integer idMateria);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM MateriaCarrera mc WHERE mc.id.idMateria = :idMateria")
    int borrarDeLaMateria(@Param("idMateria") Integer idMateria);
}
