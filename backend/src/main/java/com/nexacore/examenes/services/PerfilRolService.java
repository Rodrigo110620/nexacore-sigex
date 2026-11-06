package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.PerfilRolResponse;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Mi perfil: la información propia de cada rol (permisos, datos y materias del docente, exámenes del control). */
@Service
public class PerfilRolService {

    private final NamedParameterJdbcTemplate jdbc;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioFotoService usuarioFotoService;

    public PerfilRolService(NamedParameterJdbcTemplate jdbc, UsuarioRepository usuarioRepository, UsuarioFotoService usuarioFotoService) {
        this.jdbc = jdbc;
        this.usuarioRepository = usuarioRepository;
        this.usuarioFotoService = usuarioFotoService;
    }

    @Transactional(readOnly = true)
    public PerfilRolResponse deLaSesion(Authentication authentication) {
        Integer yo = usuarioRepository.findByEmail(authentication.getName()).map(Usuario::getId).orElse(-1);
        MapSqlParameterSource p = new MapSqlParameterSource("yo", yo);

        List<PerfilRolResponse.PermisoPerfil> permisos = Arrays.stream(Permiso.values())
                .filter(permiso -> Permisos.tiene(authentication, permiso))
                .sorted(Comparator.comparing(Permiso::modulo).thenComparing(Permiso::descripcion))
                .map(permiso -> new PerfilRolResponse.PermisoPerfil(permiso.name(), permiso.modulo(), permiso.descripcion()))
                .toList();

        List<PerfilRolResponse.DatosDocente> docente = jdbc.query(
                "SELECT titulo, especialidad, categoria FROM docente WHERE id_usuario = :yo", p,
                (rs, i) -> new PerfilRolResponse.DatosDocente(rs.getString(1), rs.getString(2), rs.getString(3), materias(p)));

        List<PerfilRolResponse.ExamenAsignado> asignados = jdbc.query("""
                SELECT x.id_examen, MIN(m.nombre), MIN(x.fecha), MIN(x.hora_inicio), MIN(x.duracion_minutos), MIN(a.nombre), MIN(x.estado)
                FROM examen_control c
                JOIN examen x ON x.id_examen = c.id_examen
                JOIN materia m ON m.id_materia = x.id_materia
                LEFT JOIN ambiente a ON a.id_ambiente = x.id_ambiente
                WHERE c.id_usuario = :yo AND x.fecha >= CURRENT_DATE AND LOWER(x.estado) <> 'cancelado'
                GROUP BY x.id_examen
                ORDER BY MIN(x.fecha), MIN(x.hora_inicio)
                LIMIT 20
                """, p, (rs, i) -> new PerfilRolResponse.ExamenAsignado(rs.getInt(1), rs.getString(2),
                rs.getDate(3).toLocalDate(), rs.getTime(4).toLocalTime(), rs.getInt(5), rs.getString(6), rs.getString(7)));

        boolean controla = Permisos.tiene(authentication, Permiso.CONTROL_INGRESO_TODOS);
        return new PerfilRolResponse(permisos, docente.isEmpty() ? null : docente.get(0),
                controla || !asignados.isEmpty() ? asignados : null,
                usuarioFotoService.tiene(yo) ? "/auth/me/foto" : null);
    }

    /** Sus materias (IMP-12) con los grupos que tiene en cada una. */
    private List<PerfilRolResponse.MateriaDocente> materias(MapSqlParameterSource p) {
        Map<Integer, PerfilRolResponse.MateriaDocente> porMateria = new LinkedHashMap<>();
        jdbc.query("""
                SELECT m.id_materia, m.sigla, m.nombre, pa.nombre_grupo
                FROM docente_materia dm
                JOIN materia m ON m.id_materia = dm.id_materia
                LEFT JOIN paralelo pa ON pa.id_materia = m.id_materia AND pa.id_docente = dm.id_docente
                WHERE dm.id_docente = :yo
                ORDER BY m.nombre, pa.nombre_grupo
                """, p, rs -> {
            var materia = porMateria.computeIfAbsent(rs.getInt(1), id -> {
                try {
                    return new PerfilRolResponse.MateriaDocente(id, rs.getString(2), rs.getString(3), new ArrayList<>());
                } catch (java.sql.SQLException e) {
                    throw new IllegalStateException(e);
                }
            });
            String grupo = rs.getString(4);
            if (grupo != null) materia.grupos().add(grupo);
        });
        return List.copyOf(porMateria.values());
    }
}
