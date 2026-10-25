package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.TrasladoAmbiente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Traslados de ambiente (INCI-03). Un examen reprogramado conserva su id: lo que cuenta es la sesión
 * actual, es decir, lo posterior al cierre de la última sesión (SesionExamenService.ultimoCierre).
 */
public interface TrasladoAmbienteRepository extends JpaRepository<TrasladoAmbiente, Integer> {

    /** Cuando el examen nunca se reprogramó (ultimoCierre null), cuenta todo. */
    LocalDateTime DESDE_SIEMPRE = LocalDateTime.of(2000, 1, 1, 0, 0);

    List<TrasladoAmbiente> findByIdExamenAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
            Integer idExamen, LocalDateTime desde);

    List<TrasladoAmbiente> findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(
            Integer idExamen, Integer idEstudiante, LocalDateTime desde);

    /** Traslados de la sesión actual del examen, del primero al último (para el reporte final). */
    default List<TrasladoAmbiente> deSesionActual(Integer idExamen, LocalDateTime ultimoCierre) {
        return findByIdExamenAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(idExamen,
                ultimoCierre == null ? DESDE_SIEMPRE : ultimoCierre);
    }

    /** Traslados de un estudiante en la sesión actual: el primero tiene su aula original ("Trasladado desde ..."). */
    default List<TrasladoAmbiente> delEstudianteEnSesionActual(Integer idExamen, Integer idEstudiante,
                                                              LocalDateTime ultimoCierre) {
        return findByIdExamenAndIdEstudianteAndFechaHoraTrasladoAfterOrderByFechaHoraTrasladoAsc(idExamen,
                idEstudiante, ultimoCierre == null ? DESDE_SIEMPRE : ultimoCierre);
    }
}
