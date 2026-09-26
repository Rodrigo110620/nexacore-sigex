package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExamenRepository extends JpaRepository<Examen, ExamenId> {

    List<Examen> findAllByOrderByFechaDescHoraInicioDesc();

    @Query("""
            SELECT e FROM Examen e
            WHERE e.idAmbiente = :idAmbiente AND e.fecha = :fecha
            """)
    List<Examen> findByAmbienteAndFecha(
            @Param("idAmbiente") Integer idAmbiente,
            @Param("fecha") LocalDate fecha);
}
