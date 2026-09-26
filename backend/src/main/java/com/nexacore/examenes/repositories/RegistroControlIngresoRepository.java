package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.RegistroControlIngreso;
import com.nexacore.examenes.models.RegistroControlIngresoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegistroControlIngresoRepository
        extends JpaRepository<RegistroControlIngreso, RegistroControlIngresoId> {

    List<RegistroControlIngreso> findByIdIdExamenAndIdIdParaleloOrderByFechaHoraAsc(
            Integer idExamen, Integer idParalelo);
}
