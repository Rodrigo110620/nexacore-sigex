package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ExamenAula;
import com.nexacore.examenes.models.ExamenAulaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ExamenAulaRepository extends JpaRepository<ExamenAula, ExamenAulaId> {

    /** Aulas adicionales del examen, con su ambiente, en el orden en que se llenan. */
    @Query("SELECT ea FROM ExamenAula ea JOIN FETCH ea.ambiente WHERE ea.id.idExamen = :idExamen ORDER BY ea.orden")
    List<ExamenAula> adicionalesDe(@Param("idExamen") Integer idExamen);

    /** Las de varios exámenes en una sola consulta, para los listados. */
    @Query("SELECT ea FROM ExamenAula ea JOIN FETCH ea.ambiente WHERE ea.id.idExamen IN :ids ORDER BY ea.orden")
    List<ExamenAula> adicionalesDe(@Param("ids") Collection<Integer> idsExamen);

    /** Bloquea la fila del examen hasta el fin de la transacción (asignación de aula por llegada). */
    @Query(value = "SELECT id_examen FROM public.examen WHERE id_examen = :idExamen FOR UPDATE", nativeQuery = true)
    Integer bloquearExamen(@Param("idExamen") Integer idExamen);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM ExamenAula ea WHERE ea.id.idExamen = :idExamen")
    void eliminarDe(@Param("idExamen") Integer idExamen);
}
