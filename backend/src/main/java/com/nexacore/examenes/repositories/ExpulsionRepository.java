package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.Expulsion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Expulsiones (INCI-01). Un examen reprogramado conserva su id: lo que cuenta es la sesión actual,
 * es decir, lo posterior al cierre de la última sesión (SesionExamenService.ultimoCierre).
 */
public interface ExpulsionRepository extends JpaRepository<Expulsion, Integer> {

    /** Lectura escalar: evita devolver la fecha null que queda en la caché tras INSERT. */
    @Query(value = "SELECT fecha_hora FROM expulsion WHERE id_expulsion = :id", nativeQuery = true)
    LocalDateTime fechaHoraRegistrada(@Param("id") Integer id);

    /** Cuando el examen nunca se reprogramó (ultimoCierre null), cuenta todo. */
    LocalDateTime DESDE_SIEMPRE = LocalDateTime.of(2000, 1, 1, 0, 0);

    List<Expulsion> findByIdExamenAndFechaHoraAfterOrderByFechaHoraDesc(Integer idExamen, LocalDateTime desde);

    boolean existsByIdEstudianteAndIdExamenAndFechaHoraAfter(Integer idEstudiante, Integer idExamen, LocalDateTime desde);

    /** Expulsiones de la sesión actual del examen, de la más reciente a la más antigua. */
    default List<Expulsion> deSesionActual(Integer idExamen, LocalDateTime ultimoCierre) {
        return findByIdExamenAndFechaHoraAfterOrderByFechaHoraDesc(idExamen,
                ultimoCierre == null ? DESDE_SIEMPRE : ultimoCierre);
    }

    /** El estudiante ya fue expulsado en la sesión actual (para no expulsarlo dos veces y mostrarlo en rojo). */
    java.util.Optional<Expulsion> findFirstByIdEstudianteAndIdExamenAndFechaHoraAfterOrderByFechaHoraAsc(
            Integer idEstudiante, Integer idExamen, LocalDateTime desde);

    /** Hora oficial de la expulsión del estudiante en la sesión actual (su cronómetro se detiene ahí). */
    default java.util.Optional<LocalDateTime> horaExpulsionEnSesionActual(Integer idEstudiante, Integer idExamen,
                                                                          LocalDateTime ultimoCierre) {
        return findFirstByIdEstudianteAndIdExamenAndFechaHoraAfterOrderByFechaHoraAsc(idEstudiante, idExamen,
                ultimoCierre == null ? DESDE_SIEMPRE : ultimoCierre).map(Expulsion::getFechaHora);
    }

    default boolean expulsadoEnSesionActual(Integer idEstudiante, Integer idExamen, LocalDateTime ultimoCierre) {
        return existsByIdEstudianteAndIdExamenAndFechaHoraAfter(idEstudiante, idExamen,
                ultimoCierre == null ? DESDE_SIEMPRE : ultimoCierre);
    }
}
