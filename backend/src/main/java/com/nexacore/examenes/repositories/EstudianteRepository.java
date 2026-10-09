package com.nexacore.examenes.repositories;

import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
import com.nexacore.examenes.models.Estudiante;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EstudianteRepository extends JpaRepository<Estudiante, Integer> {

    boolean existsByCodigoSisIgnoreCase(String codigoSis);

    boolean existsByCiIgnoreCase(String ci);

    boolean existsByEmailIgnoreCase(String email);

    List<Estudiante> findByCodigoSisIn(Collection<String> codigosSis);

    List<Estudiante> findByCiIn(Collection<String> cis);

    /**
     * Estudiante y su habilitación en un examen, en una sola consulta (HU ACCS-01).
     *
     * El filtro del examen va en el ON del LEFT JOIN y no en el WHERE: así el
     * estudiante sin fila en asistencia_examen igual se devuelve, con idExamen y
     * habilitado en null (NO_VINCULADO). Los dos métodos comparten esta parte y solo
     * cambian el WHERE, para que cada búsqueda use su índice único (uq_codigo_sis / uq_estudiante_ci).
     * Las carreras van en una subconsulta (no en un JOIN) para no repetir la fila del
     * estudiante que cursa más de una: llegan juntas separadas por coma, o null si no tiene.
     */
    String FILA_ESTUDIANTE_EXAMEN = """
            SELECT new com.nexacore.examenes.dto.EstudianteExamenFila(
                   e.id, e.nombre, e.apellidos, e.codigoSis, e.ci,
                   (SELECT listagg(cast(c.nombre as String), ', ') WITHIN GROUP (ORDER BY c.nombre)
                      FROM EstudianteCarrera ec JOIN ec.carrera c
                     WHERE ec.id.idEstudiante = e.id),
                   a.id.idExamen, a.habilitado, a.motivoInhabilitacion, a.fechaHoraIngreso)
            """;
    String ESTUDIANTE_EN_EXAMEN = """
            FROM Estudiante e
            LEFT JOIN AsistenciaExamen a
                   ON a.id.idEstudiante = e.id AND a.id.idExamen = :idExamen
            """;
    String IDENTIFICACION_ESTUDIANTE = FILA_ESTUDIANTE_EXAMEN + ESTUDIANTE_EN_EXAMEN;

    /** Identifica por código universitario (estudiante.codigo_sis), coincidencia exacta. */
    @Query(IDENTIFICACION_ESTUDIANTE + "WHERE e.codigoSis = :codigoSis")
    Optional<EstudianteExamenFila> identificarPorCodigoSis(@Param("codigoSis") String codigoSis,
                                                         @Param("idExamen") Integer idExamen);

    /** Identifica por CI (estudiante.ci), coincidencia exacta. */
    @Query(IDENTIFICACION_ESTUDIANTE + "WHERE e.ci = :ci")
    Optional<EstudianteExamenFila> identificarPorCi(@Param("ci") String ci,
                                                  @Param("idExamen") Integer idExamen);

    /** Asignados al examen: el mismo FROM exigiendo fila en asistencia_examen (el LEFT JOIN actúa como INNER). */
    String ASIGNADOS_AL_EXAMEN = ESTUDIANTE_EN_EXAMEN + "WHERE a.id.idExamen IS NOT NULL";

    /** habilitado NULL (pendiente de habilitación) cuenta como NO_HABILITADOS: tampoco puede ingresar. */
    String FILTRO_ESTADO = """
             AND (:estado = 'TODOS'
                  OR (:estado = 'HABILITADOS' AND a.habilitado = true)
                  OR (:estado = 'NO_HABILITADOS' AND (a.habilitado IS NULL OR a.habilitado = false)))
            """;

    /** estado llega validado por el service (TODOS, HABILITADOS o NO_HABILITADOS). */
    @Query(value = FILA_ESTUDIANTE_EXAMEN + ASIGNADOS_AL_EXAMEN + FILTRO_ESTADO
            + "ORDER BY e.apellidos, e.nombre, e.id",
            countQuery = "SELECT COUNT(e.id) " + ASIGNADOS_AL_EXAMEN + FILTRO_ESTADO)
    Page<EstudianteExamenFila> listarAsignadosAlExamen(@Param("idExamen") Integer idExamen,
                                                      @Param("estado") String estado,
                                                      Pageable pageable);

    /** Totales con las mismas reglas: COUNT ignora los NULL del CASE y de fecha_hora_ingreso. */
    @Query("""
            SELECT new com.nexacore.examenes.dto.ResumenEstudiantesResponse(
                   COUNT(e.id),
                   COUNT(CASE WHEN a.habilitado = true THEN 1 END),
                   COUNT(CASE WHEN a.habilitado IS NULL OR a.habilitado = false THEN 1 END),
                   COUNT(a.fechaHoraIngreso))
            """ + ASIGNADOS_AL_EXAMEN)
    ResumenEstudiantesResponse resumirAsignadosAlExamen(@Param("idExamen") Integer idExamen);


    /**
 * Listado general de estudiantes con búsqueda y filtros (paginado).
 * Para la pantalla de Gestión de Estudiantes (HU-01).
 */
@Query(value = """
        SELECT DISTINCT e FROM Estudiante e
        LEFT JOIN EstudianteCarrera ec ON ec.id.idEstudiante = e.id
        WHERE (:search IS NULL OR :search = '' OR
               LOWER(e.nombre) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(e.apellidos) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(CONCAT(e.nombre, ' ', e.apellidos)) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(CONCAT(e.apellidos, ' ', e.nombre)) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(e.codigoSis) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(e.ci) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:idFacultad IS NULL OR ec.id.idFacultad = :idFacultad)
          AND (:idCarrera IS NULL OR ec.id.idCarrera = :idCarrera)
        ORDER BY e.apellidos, e.nombre
        """,
        countQuery = """
        SELECT COUNT(DISTINCT e) FROM Estudiante e
        LEFT JOIN EstudianteCarrera ec ON ec.id.idEstudiante = e.id
        WHERE (:search IS NULL OR :search = '' OR
               LOWER(e.nombre) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(e.apellidos) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(CONCAT(e.nombre, ' ', e.apellidos)) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(CONCAT(e.apellidos, ' ', e.nombre)) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(e.codigoSis) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(e.ci) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:idFacultad IS NULL OR ec.id.idFacultad = :idFacultad)
          AND (:idCarrera IS NULL OR ec.id.idCarrera = :idCarrera)
        """)
Page<Estudiante> buscarConFiltros(
    @Param("search") String search,
    @Param("idFacultad") Integer idFacultad,
    @Param("idCarrera") Integer idCarrera,
    Pageable pageable
);
}
