package com.nexacore.examenes.repositories;

import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.models.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByEmail(String email);

    /**
     * Filtros de búsqueda compartidos por la consulta de datos y la de conteo (tarea B2).
     *
     * El CAST(... AS String) es necesario: las columnas están mapeadas con
     * length = Integer.MAX_VALUE y Hibernate 6.2 las trata como texto largo,
     * rechazando LOWER() sobre ellas ("Parameter 1 of function lower() has type STRING").
     */
    String FILTROS_BUSQUEDA = """
            WHERE (:search = ''
                   OR LOWER(CAST(u.nombre AS String)) LIKE CONCAT('%', :search, '%') ESCAPE '\\'
                   OR LOWER(CAST(u.apellidos AS String)) LIKE CONCAT('%', :search, '%') ESCAPE '\\'
                   OR LOWER(CAST(u.email AS String)) LIKE CONCAT('%', :search, '%') ESCAPE '\\'
                   OR LOWER(CAST(u.ci AS String)) LIKE CONCAT('%', :search, '%') ESCAPE '\\')
              AND (:rol = ''
                   OR EXISTS (SELECT ur FROM UsuarioRol ur JOIN ur.idRol r
                              WHERE ur.idUsuario = u AND r.nombre = :rol))
              AND (:estado = '' OR LOWER(CAST(u.estado AS String)) = :estado)
            """;

    /**
     * Busca usuarios aplicando los filtros en una sola consulta (tarea B2).
     *
     * Cada filtro se ignora si llega como cadena vacía (nunca null, para que
     * PostgreSQL pueda inferir el tipo del parámetro). El service ya entrega:
     *   search → en minúsculas y con %, _ y \ escapados; coincidencia parcial
     *   rol    → en mayúsculas (ADMIN, DOCENTE, CONTROL)
     *   estado → en minúsculas (activo, inactivo)
     *
     * El rol se filtra con EXISTS en lugar de JOIN para no duplicar usuarios
     * con varios roles; así no hace falta DISTINCT y el conteo es exacto.
     * El orden lo define el Pageable.
     */
    @Query(value = "SELECT u FROM Usuario u " + FILTROS_BUSQUEDA,
            countQuery = "SELECT COUNT(u) FROM Usuario u " + FILTROS_BUSQUEDA)
    Page<Usuario> buscar(@Param("search") String search,
                         @Param("rol") String rol,
                         @Param("estado") String estado,
                         Pageable pageable);

      /**
     * Cuenta usuarios por rol específico.
     */
    @Query("""
            SELECT COUNT(DISTINCT u) FROM Usuario u
            JOIN u.usuarioRoles ur
            JOIN ur.idRol r
            WHERE r.nombre = :rolNombre
            """)
    long countByRolNombre(@Param("rolNombre") String rolNombre);
    long countByEstado(String estado);

    /**
     * Estudiante y su habilitación en un examen, en una sola consulta (HU ACCS-01).
     *
     * El filtro del examen va en el ON del LEFT JOIN y no en el WHERE: así el
     * estudiante sin fila en asistencia_examen igual se devuelve, con idExamen y
     * habilitado en null (NO_VINCULADO). Los dos métodos comparten esta parte y solo
     * cambian el WHERE, para que cada búsqueda use su índice único (uq_codigo_sis / uq_ci).
     * La carrera también va con LEFT JOIN (id_carrera es opcional y único en carrera).
     */
    String IDENTIFICACION_ESTUDIANTE = """
            SELECT new com.nexacore.examenes.dto.EstudianteExamenFila(
                   u.nombre, u.apellidos, e.codigoSis, u.ci, c.nombre, a.id.idExamen, a.habilitado)
            FROM Estudiante e
            JOIN e.idUsuario u
            LEFT JOIN Carrera c ON c.id.idCarrera = e.idCarrera
            LEFT JOIN AsistenciaExamen a
                   ON a.id.idEstudiante = e.id.idEstudiante AND a.id.idExamen = :idExamen
            """;

    /** Identifica por código universitario (estudiante.codigo_sis), coincidencia exacta. */
    @Query(IDENTIFICACION_ESTUDIANTE + "WHERE e.codigoSis = :codigoSis")
    Optional<EstudianteExamenFila> identificarPorCodigoSis(@Param("codigoSis") String codigoSis,
                                                         @Param("idExamen") Integer idExamen);

    /** Identifica por CI (usuario.ci), coincidencia exacta; solo usuarios que son estudiantes. */
    @Query(IDENTIFICACION_ESTUDIANTE + "WHERE u.ci = :ci")
    Optional<EstudianteExamenFila> identificarPorCi(@Param("ci") String ci,
                                                  @Param("idExamen") Integer idExamen);
}