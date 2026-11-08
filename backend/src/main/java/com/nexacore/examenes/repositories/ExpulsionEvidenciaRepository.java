package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ExpulsionEvidencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExpulsionEvidenciaRepository extends JpaRepository<ExpulsionEvidencia, Integer> {

    long countByIdExpulsion(Integer idExpulsion);

    /** Datos de cada evidencia sin traer la imagen: id, tipo, tamaño en bytes y fecha. */
    @Query(value = """
            SELECT id_evidencia, tipo_contenido, OCTET_LENGTH(contenido), subida_en FROM expulsion_evidencia
            WHERE id_expulsion = :idExpulsion ORDER BY id_evidencia
            """, nativeQuery = true)
    List<Object[]> resumenDe(@Param("idExpulsion") Integer idExpulsion);
}
