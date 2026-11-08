package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.PersonalControlResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.ExamenControl;
import com.nexacore.examenes.repositories.ExamenControlRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Personal de control de cada examen (V53). Se puede asignar a usuarios activos con el rol CONTROL o con un
 * rol extra que tenga CONTROL_INGRESO_TODOS.
 */
@Service
public class ExamenControlService {

    private static final String PERSONAL = """
            SELECT u.id_usuario, u.nombre, u.apellidos, u.email FROM usuario u
            WHERE LOWER(u.estado) = 'activo' AND EXISTS (
                SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol
                WHERE ur.id_usuario = u.id_usuario
                  AND (r.nombre = 'CONTROL' OR EXISTS (SELECT 1 FROM rol_permiso rp
                       WHERE rp.id_rol = r.id_rol AND rp.codigo_permiso = 'CONTROL_INGRESO_TODOS')))
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ExamenControlRepository repository;
    private final ExamenRepository examenRepository;
    private final NotificacionService notificacionService;

    public ExamenControlService(NamedParameterJdbcTemplate jdbc, ExamenControlRepository repository,
                                ExamenRepository examenRepository, NotificacionService notificacionService) {
        this.jdbc = jdbc;
        this.repository = repository;
        this.examenRepository = examenRepository;
        this.notificacionService = notificacionService;
    }

    /** Quienes se pueden asignar como personal de control, por apellido. */
    @Transactional(readOnly = true)
    public List<PersonalControlResponse> disponibles() {
        return jdbc.query(PERSONAL + " ORDER BY u.apellidos, u.nombre", new MapSqlParameterSource(), (rs, i) ->
                new PersonalControlResponse(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4)));
    }

    /** El personal de control asignado a un examen, por apellido. */
    @Transactional(readOnly = true)
    public List<PersonalControlResponse> delExamen(Integer idExamen) {
        exigirExamen(idExamen);
        return jdbc.query("""
                SELECT u.id_usuario, u.nombre, u.apellidos, u.email FROM examen_control c
                JOIN usuario u ON u.id_usuario = c.id_usuario
                WHERE c.id_examen = :idExamen ORDER BY u.apellidos, u.nombre
                """, new MapSqlParameterSource("idExamen", idExamen), (rs, i) ->
                new PersonalControlResponse(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4)));
    }

    /**
     * Reemplaza el personal de control del examen.
     * @throws ControlIngresoException 404 si el examen no existe; 400 si alguien no es personal de control activo.
     */
    @Transactional
    public List<PersonalControlResponse> asignar(Integer idExamen, List<Integer> idUsuarios) {
        exigirExamen(idExamen);
        Set<Integer> pedidos = new LinkedHashSet<>(idUsuarios);
        pedidos.remove(null);
        if (!pedidos.isEmpty()) {
            List<Integer> validos = jdbc.queryForList("SELECT p.id_usuario FROM (" + PERSONAL + ") p WHERE p.id_usuario IN (:ids)",
                    new MapSqlParameterSource("ids", pedidos), Integer.class);
            if (validos.size() != pedidos.size()) {
                throw new ControlIngresoException(HttpStatus.BAD_REQUEST,
                        "Solo se puede asignar personal de control activo (rol CONTROL).");
            }
        }
        repository.quitarDelExamen(idExamen);
        repository.flush();
        repository.saveAllAndFlush(pedidos.stream().map(id -> new ExamenControl(idExamen, id)).toList());
        notificacionService.emitirCambio("EXAMEN", idExamen, null);
        return delExamen(idExamen);
    }

    private void exigirExamen(Integer idExamen) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
    }
}
