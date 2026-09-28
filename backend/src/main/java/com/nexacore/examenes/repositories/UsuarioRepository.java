package com.nexacore.examenes.repositories;

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
}
