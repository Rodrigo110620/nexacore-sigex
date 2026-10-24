package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ExamenSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface ExamenSesionRepository extends JpaRepository<ExamenSesion, Integer> {

    /** Cierre de la última sesión archivada del examen; null si nunca se reprogramó. */
    @Query("SELECT MAX(s.cerradaEn) FROM ExamenSesion s WHERE s.idExamen = :idExamen")
    LocalDateTime ultimoCierre(@Param("idExamen") Integer idExamen);
}
