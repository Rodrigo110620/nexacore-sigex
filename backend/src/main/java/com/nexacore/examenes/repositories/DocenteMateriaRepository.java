package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.DocenteMateria;
import com.nexacore.examenes.models.DocenteMateriaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocenteMateriaRepository extends JpaRepository<DocenteMateria, DocenteMateriaId> {

    boolean existsByIdIdDocenteAndIdIdMateria(Integer idDocente, Integer idMateria);

    @Query("SELECT dm.id.idMateria FROM DocenteMateria dm WHERE dm.id.idDocente = :idDocente")
    List<Integer> idsDeMaterias(@Param("idDocente") Integer idDocente);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM DocenteMateria dm WHERE dm.id.idDocente = :idDocente")
    void borrarDelDocente(@Param("idDocente") Integer idDocente);
}
