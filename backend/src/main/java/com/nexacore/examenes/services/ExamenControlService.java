package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.PersonalControlResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenControl;
import com.nexacore.examenes.repositories.ExamenControlRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
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

    /** Personal activo indicando si se cruza con el horario del examen consultado. */
    @Transactional(readOnly = true)
    public List<PersonalControlResponse> disponiblesParaExamen(Integer idExamen) {
        Examen examen = examenRepository.findFirstByIdIdExamen(idExamen)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND,
                        "No se encontró el examen " + idExamen));
        LocalDate fecha = examen.getFecha();
        LocalTime inicio = examen.getHoraInicio();
        LocalTime fin = inicio.plusMinutes(examen.getDuracionMinutos());
        return jdbc.query(PERSONAL + " ORDER BY u.apellidos, u.nombre", new MapSqlParameterSource(), (rs, i) -> {
            int idUsuario = rs.getInt(1);
            String conflicto = conflictoHorario(idExamen, idUsuario, fecha, inicio, fin);
            return new PersonalControlResponse(idUsuario, rs.getString(2), rs.getString(3), rs.getString(4),
                    conflicto == null, conflicto);
        });
    }

    private String conflictoHorario(Integer idExamen, Integer idUsuario, LocalDate fecha,
                                    LocalTime inicio, LocalTime fin) {
        for (Integer otroIdExamen : repository.examenesDe(idUsuario)) {
            if (otroIdExamen.equals(idExamen)) continue;
            Examen otro = examenRepository.findFirstByIdIdExamen(otroIdExamen).orElse(null);
            if (otro == null || !otro.getFecha().equals(fecha)) continue;
            LocalTime otroInicio = otro.getHoraInicio();
            LocalTime otroFin = otroInicio.plusMinutes(otro.getDuracionMinutos());
            if (inicio.isBefore(otroFin) && otroInicio.isBefore(fin)) {
                return "Ocupado " + otroInicio + "–" + otroFin;
            }
        }
        return null;
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
        validarConflictoHorarioPersonal(idExamen, pedidos);
        repository.quitarDelExamen(idExamen);
        repository.flush();
        repository.saveAllAndFlush(pedidos.stream().map(id -> new ExamenControl(idExamen, id)).toList());
        notificacionService.emitirCambio("EXAMEN", idExamen, null);
        return delExamen(idExamen);
    }

    /**
     * Impide asignar como personal de control a un usuario que ya tiene un examen en la misma fecha
     * y cuyo rango horario se solapa con el examen que se está programando. El examen que se está
     * editando (idExamen) se excluye de la comparación para permitir reasignar al mismo personal.
     */
    private void validarConflictoHorarioPersonal(Integer idExamen, Set<Integer> idUsuarios) {
        Examen examen = examenRepository.findFirstByIdIdExamen(idExamen)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND,
                        "No se encontró el examen " + idExamen));
        LocalDate fecha = examen.getFecha();
        LocalTime inicio = examen.getHoraInicio();
        LocalTime fin = inicio.plusMinutes(examen.getDuracionMinutos());

        for (Integer idUsuario : idUsuarios) {
            for (Integer otroIdExamen : repository.examenesDe(idUsuario)) {
                if (otroIdExamen.equals(idExamen)) {
                    continue; // es el mismo examen que se está editando
                }
                Examen otro = examenRepository.findFirstByIdIdExamen(otroIdExamen)
                        .orElse(null);
                if (otro == null) {
                    continue;
                }
                if (!otro.getFecha().equals(fecha)) {
                    continue;
                }
                LocalTime otroInicio = otro.getHoraInicio();
                LocalTime otroFin = otroInicio.plusMinutes(otro.getDuracionMinutos());
                if (inicio.isBefore(otroFin) && otroInicio.isBefore(fin)) {
                    throw new ControlIngresoException(HttpStatus.CONFLICT,
                            "El personal de control con id " + idUsuario
                                    + " ya tiene un examen el " + fecha
                                    + " entre " + otroInicio + " y " + otroFin
                                    + ". No se puede asignar a dos exámenes con horario solapado.");
                }
            }
        }
    }

    private void exigirExamen(Integer idExamen) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
    }
}
