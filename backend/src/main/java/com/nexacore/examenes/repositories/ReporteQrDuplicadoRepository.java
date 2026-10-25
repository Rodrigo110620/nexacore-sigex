package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.ReporteQrDuplicado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReporteQrDuplicadoRepository extends JpaRepository<ReporteQrDuplicado, Integer> {
    List<ReporteQrDuplicado> findByIdExamenOrderByFechaHoraServidorDesc(Integer idExamen);
    Optional<ReporteQrDuplicado> findByIdAndIdExamen(Integer id, Integer idExamen);
}
