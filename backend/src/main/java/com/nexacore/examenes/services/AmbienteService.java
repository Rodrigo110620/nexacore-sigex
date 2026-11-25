package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AmbienteDisponibilidadResponse;
import com.nexacore.examenes.dto.AmbienteResponse;
import com.nexacore.examenes.dto.CrearAmbienteRequest;
import com.nexacore.examenes.exceptions.AmbienteDuplicadoException;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import org.springframework.http.HttpStatus;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.utils.ValidacionPalabras;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Service
public class AmbienteService {

    private final AmbienteRepository ambienteRepository;
    private final ExamenRepository examenRepository;
    private final ExamenAulaRepository examenAulaRepository;

    public AmbienteService(AmbienteRepository ambienteRepository, ExamenRepository examenRepository,
                           ExamenAulaRepository examenAulaRepository) {
        this.ambienteRepository = ambienteRepository;
        this.examenRepository = examenRepository;
        this.examenAulaRepository = examenAulaRepository;
    }

    /** Para describir con qué examen choca un aula ocupada (opcional: sin él, solo el horario). */
    private org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setJdbc(org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** «Base de Datos I · G1 · 18:35–20:05». */
    private String describir(Examen e) {
        String horario = e.getHoraInicio() + "–" + e.getHoraInicio().plusMinutes(e.getDuracionMinutos());
        if (jdbc == null) return horario;
        try {
            String examen = jdbc.queryForObject("""
                    SELECT m.nombre || ' · ' || p.nombre_grupo FROM examen ex
                    JOIN materia m ON m.id_materia = ex.id_materia
                    JOIN paralelo p ON p.id_paralelo = ex.id_paralelo
                    WHERE ex.id_examen = :idExamen AND ex.id_paralelo = :idParalelo
                    """, new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("idExamen", e.getId().getIdExamen())
                    .addValue("idParalelo", e.getId().getIdParalelo()), String.class);
            return examen == null ? horario : examen + " · " + horario;
        } catch (org.springframework.dao.DataAccessException ex) {
            return horario;
        }
    }

    @Transactional(readOnly = true)
    public List<AmbienteResponse> listar() {
        return ambienteRepository.findAllByOrderByNombreAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AmbienteResponse crear(CrearAmbienteRequest request) {
        String nombre = request.nombre().trim().toUpperCase();
        if (!ValidacionPalabras.esCodigoDeAmbiente(nombre)) {
            throw new IllegalArgumentException("Usa un código de aula (ej. 692F, 682L0IN, L813) "
                    + "o un nombre abreviado que se pueda leer (ej. INFLAB, LABMAT)");
        }
        if (ambienteRepository.existsByNombreIgnoreCase(nombre)) {
            throw new AmbienteDuplicadoException(nombre);
        }
        Ambiente ambiente = new Ambiente();
        ambiente.setNombre(nombre);
        ambiente.setUbicacion(
                request.ubicacion() == null || request.ubicacion().isBlank()
                        ? "FCyT UMSS"
                        : request.ubicacion().trim());
        ambiente.setCapacidad(request.capacidad());
        ambiente.setPabellon(
                request.pabellon() == null || request.pabellon().isBlank() ? null : request.pabellon().trim());
        try {
            return toResponse(ambienteRepository.saveAndFlush(ambiente));
        } catch (DataIntegrityViolationException e) {
            // Otro usuario lo creó entre la verificación y el guardado (uq_ambiente_nombre).
            throw new AmbienteDuplicadoException(nombre);
        }
    }

    /**
     * Registra el aforo de un aula. Quien programa exámenes (también el DOCENTE) puede registrarlo si el
     * aula todavía no lo tiene, para no depender del ADMIN; cambiar uno ya registrado es solo de quien
     * gestiona los ambientes, porque afecta el reparto de los exámenes de otros en esa aula.
     */
    @Transactional
    public AmbienteResponse actualizarAforo(Integer id, Integer capacidad) {
        // Con bloqueo: si dos docentes registran el aforo de la misma aula a la vez, el segundo ve el del primero.
        Ambiente ambiente = ambienteRepository.bloquear(id)
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));
        if (ambiente.getCapacidad() != null && !ambiente.getCapacidad().equals(capacidad)
                && !Permisos.tiene(Permiso.AMBIENTES_GESTIONAR)) {
            throw new ControlIngresoException(HttpStatus.FORBIDDEN, "El aforo de " + ambiente.getNombre() + " ya está registrado ("
                    + ambiente.getCapacidad() + "). Para cambiarlo, pide al administrador.");
        }
        ambiente.setCapacidad(capacidad);
        return toResponse(ambienteRepository.save(ambiente));
    }

    private AmbienteResponse toResponse(Ambiente ambiente) {
        return new AmbienteResponse(ambiente.getId(), ambiente.getNombre(), ambiente.getUbicacion(),
                ambiente.getCapacidad(), ambiente.getPabellon());
    }

    /** Para saber el docente de la sesión; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.nexacore.examenes.repositories.UsuarioRepository usuarioRepositorio;

    /**
     * Todas las aulas con disponible=false si alguna está ocupada en ese horario, como aula principal
     * o adicional de otro examen. Dos consultas en total (exámenes del día y sus aulas adicionales),
     * en lugar de una por aula: con una base remota, 100+ consultas superaban el tiempo de espera.
     */
    @Transactional(readOnly = true)
    public List<AmbienteDisponibilidadResponse> disponibilidad(
            LocalDate fecha, LocalTime horaInicio, int duracionMinutos,
            Integer idExamenExcluido, Integer idParaleloExcluido) {
        return disponibilidad(fecha, horaInicio, duracionMinutos, idExamenExcluido, idParaleloExcluido, null, null);
    }

    /**
     * Con materia (y docente; si no viene, el de la sesión): el aula del examen conjunto de otro grupo de la misma
     * materia y docente, a la misma hora y duración, sigue disponible para compartirla (BUG-B02).
     */
    @Transactional(readOnly = true)
    public List<AmbienteDisponibilidadResponse> disponibilidad(
            LocalDate fecha, LocalTime horaInicio, int duracionMinutos,
            Integer idExamenExcluido, Integer idParaleloExcluido, Integer idMateria, Integer idDocente) {
        Integer docente = idDocente != null ? idDocente
                : idMateria == null || usuarioRepositorio == null ? null
                : usuarioRepositorio.findByEmail(com.nexacore.examenes.security.SesionActual.email())
                        .map(com.nexacore.examenes.models.Usuario::getId).orElse(null);
        LocalTime horaFin = horaInicio.plusMinutes(duracionMinutos);
        List<Examen> queSeCruzan = examenRepository.findVigentesEnFecha(fecha).stream()
                .filter(e -> idMateria == null || docente == null || !(idMateria.equals(e.getIdMateria())
                        && docente.equals(e.getIdDocente()) && horaInicio.equals(e.getHoraInicio())
                        && Integer.valueOf(duracionMinutos).equals(e.getDuracionMinutos())))
                .filter(e -> !(e.getId().getIdExamen().equals(idExamenExcluido)
                        && e.getId().getIdParalelo().equals(idParaleloExcluido))) // el propio examen al editar
                .filter(e -> {
                    LocalTime ini = e.getHoraInicio();
                    return horaInicio.isBefore(ini.plusMinutes(e.getDuracionMinutos())) && ini.isBefore(horaFin);
                })
                .toList();
        // Cada aula ocupada, con el examen que la ocupa (el primero, si hubiera más de uno).
        java.util.Map<Integer, Examen> ocupadas = new java.util.HashMap<>();
        queSeCruzan.forEach(e -> ocupadas.putIfAbsent(e.getIdAmbiente(), e));
        if (!queSeCruzan.isEmpty()) {
            java.util.Map<Integer, Examen> porId = new java.util.HashMap<>();
            queSeCruzan.forEach(e -> porId.putIfAbsent(e.getId().getIdExamen(), e));
            examenAulaRepository.adicionalesDe(new java.util.ArrayList<>(porId.keySet()))
                    .forEach(ea -> ocupadas.putIfAbsent(ea.getId().getIdAmbiente(), porId.get(ea.getId().getIdExamen())));
        }
        java.util.Map<Examen, String> descripciones = new java.util.HashMap<>();
        return ambienteRepository.findAllByOrderByNombreAsc().stream()
                .map(a -> {
                    Examen otro = ocupadas.get(a.getId());
                    return new AmbienteDisponibilidadResponse(a.getId(), a.getNombre(), a.getUbicacion(), a.getCapacidad(),
                            a.getPabellon(), otro == null, otro == null ? null : descripciones.computeIfAbsent(otro, this::describir));
                })
                .toList();
    }
}
