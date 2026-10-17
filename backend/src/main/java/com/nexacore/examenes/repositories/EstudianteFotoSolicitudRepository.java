package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.EstudianteFotoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EstudianteFotoSolicitudRepository extends JpaRepository<EstudianteFotoSolicitud, Integer> {
    List<EstudianteFotoSolicitud> findByEstadoOrderByEnviadaEnAsc(String estado);
}
