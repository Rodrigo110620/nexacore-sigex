package com.nexacore.examenes.services;

import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Permisos de los roles extra (tabla rol_permiso, V48) con caché en memoria: se recarga al editar un rol.
 * Los roles del sistema tienen los suyos fijos en {@link Permisos}.
 * Las rutas lo usan en @PreAuthorize: {@code @permisos.tiene(authentication, 'REPORTES_VER')}.
 */
@Service("permisos")
public class PermisoService {

    private final JdbcTemplate jdbc;
    private volatile Map<String, Set<String>> porRol = Map.of();

    public PermisoService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void recargar() {
        Map<String, Set<String>> mapa = new HashMap<>();
        try {
            jdbc.query("SELECT r.nombre, rp.codigo_permiso FROM rol_permiso rp JOIN rol r ON r.id_rol = rp.id_rol",
                    rs -> { mapa.computeIfAbsent(rs.getString(1), k -> new HashSet<>()).add(rs.getString(2)); });
        } catch (org.springframework.dao.DataAccessException e) {
            mapa.clear(); // sin la tabla todavía: solo cuentan los roles del sistema
        }
        porRol = mapa;
        Permisos.usarFuente(rol -> porRol.getOrDefault(rol, Set.of()));
    }

    public boolean tiene(Authentication auth, String codigo) {
        return Permisos.de(auth).contains(codigo);
    }

    public boolean alguno(Authentication auth, String... codigos) {
        Set<String> suyos = Permisos.de(auth);
        return Arrays.stream(codigos).anyMatch(suyos::contains);
    }

    /** Para validar códigos que llegan desde la pantalla de roles. */
    public static boolean existe(String codigo) {
        return Permiso.existe(codigo);
    }
}
