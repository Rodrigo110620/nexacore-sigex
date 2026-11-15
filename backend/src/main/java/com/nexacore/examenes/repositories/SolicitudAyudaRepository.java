package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.SolicitudAyuda;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitudAyudaRepository extends JpaRepository<SolicitudAyuda, Integer> {
    Page<SolicitudAyuda> findByEstadoOrderByCreadaEnDesc(String estado, Pageable pagina);

    Page<SolicitudAyuda> findAllByOrderByCreadaEnDesc(Pageable pagina);

    long countByEstado(String estado);
}
