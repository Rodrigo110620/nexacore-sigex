package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.SesionUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SesionUsuarioRepository extends JpaRepository<SesionUsuario, String> {

    /** Sesiones abiertas del usuario con actividad desde esa hora (las más antiguas ya vencieron con su token). */
    @Query("""
            SELECT s FROM SesionUsuario s
            WHERE s.idUsuario = :idUsuario AND s.cerradaEn IS NULL AND s.ultimaActividad >= :desde
            ORDER BY s.ultimaActividad DESC
            """)
    List<SesionUsuario> abiertas(@Param("idUsuario") Integer idUsuario, @Param("desde") LocalDateTime desde);

    @Query("SELECT COUNT(s) > 0 FROM SesionUsuario s WHERE s.id = :id AND s.cerradaEn IS NULL")
    boolean estaAbierta(@Param("id") String id);

    /** Marca actividad como mucho una vez por minuto, para no escribir en cada petición. */
    @Modifying
    @Query("""
            UPDATE SesionUsuario s SET s.ultimaActividad = :ahora
            WHERE s.id = :id AND s.cerradaEn IS NULL AND s.ultimaActividad < :haceUnMinuto
            """)
    int registrarActividad(@Param("id") String id, @Param("ahora") LocalDateTime ahora,
                           @Param("haceUnMinuto") LocalDateTime haceUnMinuto);

    @Modifying
    @Query("""
            UPDATE SesionUsuario s SET s.cerradaEn = :ahora, s.motivoCierre = :motivo
            WHERE s.idUsuario = :idUsuario AND s.cerradaEn IS NULL AND (:excepto IS NULL OR s.id <> :excepto)
            """)
    int cerrarDelUsuario(@Param("idUsuario") Integer idUsuario, @Param("excepto") String excepto,
                         @Param("motivo") String motivo, @Param("ahora") LocalDateTime ahora);
}
