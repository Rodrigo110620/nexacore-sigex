package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.InscripcionParalelo;
import com.nexacore.examenes.models.InscripcionParaleloId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InscripcionParaleloRepository extends JpaRepository<InscripcionParalelo, InscripcionParaleloId> {

    /** Estudiantes inscritos en el paralelo (paralelo + materia + docente). */
    @Query("""
            SELECT i.id.idEstudiante FROM InscripcionParalelo i
            WHERE i.id.idParalelo = :idParalelo AND i.id.idMateria = :idMateria AND i.id.idDocente = :idDocente
            """)
    List<Integer> idsInscritos(@Param("idParalelo") Integer idParalelo,
                               @Param("idMateria") Integer idMateria,
                               @Param("idDocente") Integer idDocente);
}
