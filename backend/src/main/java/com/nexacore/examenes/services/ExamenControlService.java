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
        return disponiblesEn(new Horario(idExamen, examen.getFecha(), examen.getHoraInicio(), examen.getDuracionMinutos(),
                examen.getIdMateria(), examen.getIdDocente()));
    }

    /**
     * Personal activo y si está libre en un horario que todavía no es examen (al registrarlo). Con la materia y el
     * docente, el grupo que se toma junto (misma materia, docente, inicio y duración) no cuenta como cruce.
     */
    @Transactional(readOnly = true)
    public List<PersonalControlResponse> disponiblesEnHorario(LocalDate fecha, LocalTime inicio, int duracionMinutos,
                                                             Integer idMateria, Integer idDocente) {
        if (duracionMinutos < 1) throw new IllegalArgumentException("La duración debe ser al menos 1 minuto");
        return disponiblesEn(new Horario(null, fecha, inicio, duracionMinutos, idMateria, idDocente));
    }

    /** Un horario de examen: el que se consulta o el que se está registrando (idExamen null). */
    record Horario(Integer idExamen, LocalDate fecha, LocalTime inicio, int duracionMinutos, Integer idMateria, Integer idDocente) {
        LocalTime fin() { return inicio.plusMinutes(duracionMinutos); }

        /** El mismo examen, o el otro grupo que se toma junto con este: no es un cruce para el control. */
        boolean esElMismoOConjunto(Examen otro) {
            if (idExamen != null && idExamen.equals(otro.getId().getIdExamen())) return true;
            return idMateria != null && idMateria.equals(otro.getIdMateria())
                    && idDocente != null && idDocente.equals(otro.getIdDocente())
                    && inicio.equals(otro.getHoraInicio()) && duracionMinutos == otro.getDuracionMinutos();
        }
    }

    private List<PersonalControlResponse> disponiblesEn(Horario horario) {
        return jdbc.query(PERSONAL + " ORDER BY u.apellidos, u.nombre", new MapSqlParameterSource(), (rs, i) -> {
            int idUsuario = rs.getInt(1);
            String conflicto = conflictoHorario(horario, idUsuario);
            return new PersonalControlResponse(idUsuario, rs.getString(2), rs.getString(3), rs.getString(4),
                    conflicto == null, conflicto);
        });
    }

    private String conflictoHorario(Horario horario, Integer idUsuario) {
        for (Integer otroIdExamen : repository.examenesDe(idUsuario)) {
            Examen otro = examenRepository.findFirstByIdIdExamen(otroIdExamen).orElse(null);
            if (otro == null || !otro.getFecha().equals(horario.fecha()) || horario.esElMismoOConjunto(otro)) continue;
            if ("cancelado".equalsIgnoreCase(otro.getEstado())) continue;
            LocalTime otroInicio = otro.getHoraInicio();
            LocalTime otroFin = otroInicio.plusMinutes(otro.getDuracionMinutos());
            if (horario.inicio().isBefore(otroFin) && otroInicio.isBefore(horario.fin())) {
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
                SELECT u.id_usuario, u.nombre, u.apellidos, u.email, c.id_ambiente, a.nombre FROM examen_control c
                JOIN usuario u ON u.id_usuario = c.id_usuario
                LEFT JOIN ambiente a ON a.id_ambiente = c.id_ambiente
                WHERE c.id_examen = :idExamen ORDER BY a.nombre NULLS LAST, u.apellidos, u.nombre
                """, new MapSqlParameterSource("idExamen", idExamen), (rs, i) ->
                new PersonalControlResponse(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4), true, null,
                        (Integer) rs.getObject(5), rs.getString(6)));
    }

    /** El aula a cargo del usuario en el examen (null si no está asignado o no tiene aula fija). */
    @Transactional(readOnly = true)
    public PersonalControlResponse asignacionDe(Integer idExamen, String email) {
        return delExamen(idExamen).stream().filter(p -> p.email() != null && p.email().equalsIgnoreCase(email)).findFirst().orElse(null);
    }

    /** Aulas del examen en el orden en que se llenan: la principal y las adicionales. */
    private List<Integer> aulasDelExamen(Integer idExamen) {
        return jdbc.queryForList("""
                SELECT id_ambiente FROM (
                    SELECT e.id_ambiente, 0 AS orden FROM examen e WHERE e.id_examen = :idExamen
                    UNION
                    SELECT ea.id_ambiente, ea.orden + 1 FROM examen_aula ea WHERE ea.id_examen = :idExamen
                ) x GROUP BY id_ambiente ORDER BY min(orden)
                """, new MapSqlParameterSource("idExamen", idExamen), Integer.class);
    }

    /**
     * Reemplaza el personal de control del examen.
     * @throws ControlIngresoException 404 si el examen no existe; 400 si alguien no es personal de control activo.
     */
    @Transactional
    public List<PersonalControlResponse> asignar(Integer idExamen, List<Integer> idUsuarios) {
        return asignar(idExamen, idUsuarios, null);
    }

    /**
     * Reemplaza el personal de control del examen, con el aula de cada uno (V66). Sin aulas indicadas y con varias
     * aulas en el examen, se reparten en orden (uno por aula, y se vuelve a empezar si hay más personal que aulas).
     * @throws ControlIngresoException 400 si un aula no es del examen.
     */
    @Transactional
    public List<PersonalControlResponse> asignar(Integer idExamen, List<Integer> idUsuarios, java.util.Map<Integer, Integer> aulas) {
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
        List<Integer> aulasExamen = pedidos.isEmpty() ? List.of() : aulasDelExamen(idExamen);
        java.util.Map<Integer, Integer> aulaDe = new java.util.HashMap<>();
        int siguiente = 0;
        for (Integer idUsuario : pedidos) {
            Integer elegida = aulas == null ? null : aulas.get(idUsuario);
            if (elegida != null && !aulasExamen.contains(elegida)) {
                throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "El aula elegida para el personal de control no es de este examen.");
            }
            if (elegida == null && aulasExamen.size() > 1) elegida = aulasExamen.get(siguiente++ % aulasExamen.size());
            if (elegida == null && aulasExamen.size() == 1) elegida = aulasExamen.get(0);
            aulaDe.put(idUsuario, elegida);
        }
        repository.quitarDelExamen(idExamen);
        repository.flush();
        repository.saveAllAndFlush(pedidos.stream().map(id -> new ExamenControl(idExamen, id, aulaDe.get(id))).toList());
        notificacionService.emitirCambio("EXAMEN", idExamen, null);
        return delExamen(idExamen);
    }

    /**
     * Tras editar o reprogramar el examen: su personal de control sigue sin cruces con el nuevo horario y cada uno
     * sigue en un aula del examen (si se quitó la suya, se reparte de nuevo). Si alguien quedó cruzado, no se guarda.
     */
    @Transactional
    public void revisarTrasCambio(Integer idExamen) {
        List<Integer> asignados = repository.asignadosA(idExamen);
        if (asignados.isEmpty()) return;
        List<Integer> aulasExamen = aulasDelExamen(idExamen);
        java.util.Map<Integer, Integer> aulasVigentes = new java.util.HashMap<>();
        for (PersonalControlResponse p : delExamen(idExamen)) {
            if (p.idAmbiente() != null && aulasExamen.contains(p.idAmbiente())) aulasVigentes.put(p.idUsuario(), p.idAmbiente());
        }
        try {
            asignar(idExamen, asignados, aulasVigentes);
        } catch (ControlIngresoException e) {
            if (e.getStatus() != HttpStatus.CONFLICT) throw e;
            throw new ControlIngresoException(HttpStatus.CONFLICT, "No se puede cambiar el horario: " + e.getMessage()
                    .replace(" No se puede asignar a dos exámenes con horario cruzado.", "")
                    + " Quítalo del personal de control o elige otro horario.");
        }
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
        Horario horario = new Horario(idExamen, examen.getFecha(), examen.getHoraInicio(), examen.getDuracionMinutos(),
                examen.getIdMateria(), examen.getIdDocente());
        for (Integer idUsuario : idUsuarios) {
            String conflicto = conflictoHorario(horario, idUsuario);
            if (conflicto != null) {
                String nombre = null;
                try {
                    nombre = jdbc.queryForObject("SELECT trim(nombre || ' ' || apellidos) FROM usuario WHERE id_usuario = :id",
                            new MapSqlParameterSource("id", idUsuario), String.class);
                } catch (org.springframework.dao.DataAccessException e) {
                    // sin el nombre, el mensaje sigue siendo claro
                }
                throw new ControlIngresoException(HttpStatus.CONFLICT,
                        (nombre == null || nombre.isBlank() ? "El personal de control" : nombre) + " ya tiene un examen el "
                                + horario.fecha() + " (" + conflicto.replace("Ocupado ", "")
                                + "). No se puede asignar a dos exámenes con horario cruzado.");
            }
        }
    }

    private void exigirExamen(Integer idExamen) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
    }
}
