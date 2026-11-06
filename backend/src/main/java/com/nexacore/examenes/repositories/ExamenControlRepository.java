package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ExamenControl;
import com.nexacore.examenes.models.ExamenControlId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExamenControlRepository extends JpaRepository<ExamenControl, ExamenControlId> {

    @Modifying
    @Query("DELETE FROM ExamenControl c WHERE c.id.idExamen = :idExamen")
    void quitarDelExamen(@Param("idExamen") Integer idExamen);

    @Query("SELECT c.id.idUsuario FROM ExamenControl c WHERE c.id.idExamen = :idExamen")
    java.util.List<Integer> asignadosA(@Param("idExamen") Integer idExamen);

    @Query("SELECT c.id.idExamen FROM ExamenControl c WHERE c.id.idUsuario = :idUsuario")
    java.util.List<Integer> examenesDe(@Param("idUsuario") Integer idUsuario);

    default boolean estaAsignado(Integer idExamen, Integer idUsuario) {
        return idExamen != null && idUsuario != null && existsById(new ExamenControlId(idExamen, idUsuario));
    }
}
