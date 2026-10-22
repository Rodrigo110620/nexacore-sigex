package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ReporteFoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReporteFotoRepository extends JpaRepository<ReporteFoto, Integer> {
    Optional<ReporteFoto> findFirstByIdEstudianteAndEstado(Integer idEstudiante, String estado);

    List<ReporteFoto> findByEstadoOrderByCreadoEnAsc(String estado);
}
