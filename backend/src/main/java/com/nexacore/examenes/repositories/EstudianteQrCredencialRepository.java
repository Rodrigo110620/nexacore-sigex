package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.EstudianteQrCredencial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EstudianteQrCredencialRepository extends JpaRepository<EstudianteQrCredencial, Integer> {
    Optional<EstudianteQrCredencial> findByHashCredencialAndRevocadoFalse(String hashCredencial);
}
