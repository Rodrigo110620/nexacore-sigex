package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ActualizarHabilitacionRequest;
import com.nexacore.examenes.dto.AsociacionLoteResponse;
import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.EstudianteHabilitacionResponse;
import com.nexacore.examenes.dto.EstudianteHabilitacionResponse.EstadoHabilitacion;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.exceptions.EstudianteNoEncontradoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.AsistenciaExamenId;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.models.InscripcionParalelo;
import com.nexacore.examenes.models.InscripcionParaleloId;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.InscripcionParaleloRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Habilitación de estudiantes en un examen (pestaña "Estudiantes habilitados").
 *
 * Trabaja sobre asistencia_examen: tener fila significa estar asociado al examen y
 * la columna habilitado decide el estado (false → NO_HABILITADO; true o null → HABILITADO,
 * igual que en el control de ingreso). Si el examen no existe responde 404.
 *
 * Asociar también inscribe al estudiante en el paralelo del examen (misma materia y
 * docente) si aún no lo estaba, para que inscripcion_paralelo refleje quién rinde.
 */
@Service
public class HabilitacionService {

    private static final String SIN_FACULTAD = "—";

    private final AsistenciaExamenRepository asistenciaExamenRepository;
    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final ExamenRepository examenRepository;
    private final InscripcionParaleloRepository inscripcionParaleloRepository;

    public HabilitacionService(AsistenciaExamenRepository asistenciaExamenRepository,
                               EstudianteRepository estudianteRepository,
                               EstudianteCarreraRepository estudianteCarreraRepository,
                               ExamenRepository examenRepository,
                               InscripcionParaleloRepository inscripcionParaleloRepository) {
        this.asistenciaExamenRepository = asistenciaExamenRepository;
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.examenRepository = examenRepository;
        this.inscripcionParaleloRepository = inscripcionParaleloRepository;
    }

    @Transactional(readOnly = true)
    public List<EstudianteHabilitacionResponse> listar(Integer idExamen, Integer idParalelo) {
        buscarExamen(idExamen, idParalelo);
        return listarSinVerificar(idExamen, idParalelo);
    }

    /**
     * Asocia al examen al estudiante con ese código universitario o CI, habilitado.
     *
     * @throws EstudianteNoEncontradoException si no existe (404)
     * @throws EstudianteDuplicadoException    si ya está asociado al examen (409)
     */
    @Transactional
    public List<EstudianteHabilitacionResponse> asociar(Integer idExamen, Integer idParalelo, String identificador) {
        String buscado = identificador == null ? "" : identificador.trim();
        if (buscado.isEmpty()) {
            throw new IllegalArgumentException("Ingrese el código universitario o el CI del estudiante");
        }
        Examen examen = buscarExamen(idExamen, idParalelo);
        EstudianteExamenFila fila = estudianteRepository.identificarPorCodigoSis(buscado, idExamen)
                .or(() -> estudianteRepository.identificarPorCi(buscado, idExamen))
                .orElseThrow(() -> new EstudianteNoEncontradoException("código universitario o CI", buscado));
        if (fila.idExamen() != null) {
            throw new EstudianteDuplicadoException(
                    fila.nombre() + " " + fila.apellidos() + " ya está asociado a este examen");
        }
        registrar(examen, List.of(fila.idEstudiante()));
        return listarSinVerificar(idExamen, idParalelo);
    }

    /**
     * Asocia varios estudiantes por código universitario o CI (pueden mezclarse). Los que
     * ya están en el examen o no existen no detienen al resto: vuelven en el resultado.
     */
    @Transactional
    public AsociacionLoteResponse asociarLote(Integer idExamen, Integer idParalelo, List<String> identificadores) {
        Set<String> buscados = identificadores.stream()
                .filter(i -> i != null && !i.isBlank())
                .map(String::trim)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (buscados.isEmpty()) {
            throw new IllegalArgumentException("Ingrese al menos un código universitario o CI");
        }
        Examen examen = buscarExamen(idExamen, idParalelo);
        Map<String, Estudiante> porCodigo = estudianteRepository.findByCodigoSisIn(buscados).stream()
                .collect(Collectors.toMap(Estudiante::getCodigoSis, Function.identity()));
        Map<String, Estudiante> porCi = estudianteRepository.findByCiIn(buscados).stream()
                .collect(Collectors.toMap(Estudiante::getCi, Function.identity()));
        Set<Integer> yaEnExamen = new HashSet<>(asistenciaExamenRepository.idsEstudiantesDelExamen(idExamen));

        // Un mismo estudiante puede venir por código y por CI: el Set lo deja una sola vez.
        Set<Integer> nuevos = new LinkedHashSet<>();
        List<String> yaAsociados = new ArrayList<>();
        List<String> noEncontrados = new ArrayList<>();
        for (String buscado : buscados) {
            Estudiante estudiante = porCodigo.getOrDefault(buscado, porCi.get(buscado));
            if (estudiante == null) {
                noEncontrados.add(buscado);
            } else if (yaEnExamen.contains(estudiante.getId())) {
                yaAsociados.add(buscado);
            } else {
                nuevos.add(estudiante.getId());
            }
        }
        registrar(examen, nuevos);
        return new AsociacionLoteResponse(nuevos.size(), yaAsociados, noEncontrados,
                listarSinVerificar(idExamen, idParalelo));
    }

    /** Asocia a todos los inscritos en el paralelo del examen que aún no estén asociados. */
    @Transactional
    public AsociacionLoteResponse asociarInscritos(Integer idExamen, Integer idParalelo) {
        Examen examen = buscarExamen(idExamen, idParalelo);
        Set<Integer> nuevos = new LinkedHashSet<>(inscripcionParaleloRepository.idsInscritos(
                idParalelo, examen.getIdMateria(), examen.getIdDocente()));
        nuevos.removeAll(asistenciaExamenRepository.idsEstudiantesDelExamen(idExamen));
        registrar(examen, nuevos);
        return new AsociacionLoteResponse(nuevos.size(), List.of(), List.of(),
                listarSinVerificar(idExamen, idParalelo));
    }

    /**
     * Cambia la habilitación de los estudiantes indicados; todos deben estar asociados al examen.
     *
     * @throws IllegalArgumentException si alguno no está asociado (400)
     */
    @Transactional
    public List<EstudianteHabilitacionResponse> actualizar(Integer idExamen, Integer idParalelo,
                                                           ActualizarHabilitacionRequest request) {
        buscarExamen(idExamen, idParalelo);
        Set<Integer> ids = new HashSet<>(request.idsEstudiante());
        List<AsistenciaExamen> asistencias = asistenciaExamenRepository.buscarDelExamen(idExamen, idParalelo, ids);
        if (asistencias.size() != ids.size()) {
            throw new IllegalArgumentException("Algunos estudiantes seleccionados no están asociados a este examen");
        }
        boolean habilitado = request.estadoHabilitacion() == EstadoHabilitacion.HABILITADO;
        String motivo = request.motivo() == null || request.motivo().isBlank() ? null : request.motivo().trim();
        for (AsistenciaExamen asistencia : asistencias) {
            asistencia.setHabilitado(habilitado);
            asistencia.setMotivoInhabilitacion(motivo);
        }
        asistenciaExamenRepository.saveAllAndFlush(asistencias);
        return listarSinVerificar(idExamen, idParalelo);
    }

    /**
     * Inscribe en el paralelo del examen a quienes no lo estén y los asocia al examen habilitados.
     * Quien llama ya descartó a los asociados.
     */
    private void registrar(Examen examen, Collection<Integer> idsEstudiante) {
        if (idsEstudiante.isEmpty()) {
            return;
        }
        Integer idExamen = examen.getId().getIdExamen();
        Integer idParalelo = examen.getId().getIdParalelo();
        Set<Integer> inscritos = new HashSet<>(inscripcionParaleloRepository.idsInscritos(
                idParalelo, examen.getIdMateria(), examen.getIdDocente()));
        Instant ahora = Instant.now();
        List<InscripcionParalelo> inscripciones = new ArrayList<>();
        List<AsistenciaExamen> asistencias = new ArrayList<>();
        for (Integer idEstudiante : idsEstudiante) {
            // Las relaciones no se insertan (insertable = false), pero quedan en caché tras guardar:
            // sin ellas, el listado posterior recibe estas mismas instancias con estudiante en null.
            Estudiante estudiante = estudianteRepository.getReferenceById(idEstudiante);
            if (!inscritos.contains(idEstudiante)) {
                InscripcionParaleloId idInscripcion = new InscripcionParaleloId();
                idInscripcion.setIdEstudiante(idEstudiante);
                idInscripcion.setIdParalelo(idParalelo);
                idInscripcion.setIdMateria(examen.getIdMateria());
                idInscripcion.setIdDocente(examen.getIdDocente());
                InscripcionParalelo inscripcion = new InscripcionParalelo();
                inscripcion.setId(idInscripcion);
                inscripcion.setEstudiante(estudiante);
                inscripcion.setFechaInscripcion(ahora);
                inscripcion.setEstado("inscrito");
                inscripciones.add(inscripcion);
            }
            AsistenciaExamenId id = new AsistenciaExamenId();
            id.setIdEstudiante(idEstudiante);
            id.setIdExamen(idExamen);
            AsistenciaExamen asistencia = new AsistenciaExamen();
            asistencia.setId(id);
            asistencia.setIdParalelo(idParalelo);
            asistencia.setEstudiante(estudiante);
            asistencia.setHabilitado(true);
            asistencias.add(asistencia);
        }
        inscripcionParaleloRepository.saveAll(inscripciones);
        asistenciaExamenRepository.saveAllAndFlush(asistencias);
    }

    private Examen buscarExamen(Integer idExamen, Integer idParalelo) {
        ExamenId id = new ExamenId();
        id.setIdExamen(idExamen);
        id.setIdParalelo(idParalelo);
        return examenRepository.findById(id).orElseThrow(
                () -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen));
    }

    private List<EstudianteHabilitacionResponse> listarSinVerificar(Integer idExamen, Integer idParalelo) {
        return aRespuestas(asistenciaExamenRepository.listarDelExamen(idExamen, idParalelo));
    }

    private List<EstudianteHabilitacionResponse> aRespuestas(List<AsistenciaExamen> asistencias) {
        if (asistencias.isEmpty()) {
            return List.of();
        }
        Set<Integer> ids = asistencias.stream()
                .map(a -> a.getId().getIdEstudiante())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        // Una sola consulta para las facultades de todos; sin duplicados y en orden alfabético.
        Map<Integer, String> facultades = estudianteCarreraRepository.findByEstudianteIds(ids).stream()
                .collect(Collectors.groupingBy(
                        ec -> ec.getId().getIdEstudiante(),
                        Collectors.mapping(this::nombreFacultad,
                                Collectors.collectingAndThen(Collectors.toCollection(TreeSet::new),
                                        nombres -> String.join(", ", nombres)))));
        return asistencias.stream().map(a -> {
            Estudiante e = a.getEstudiante();
            EstadoHabilitacion estado = Boolean.FALSE.equals(a.getHabilitado())
                    ? EstadoHabilitacion.NO_HABILITADO
                    : EstadoHabilitacion.HABILITADO;
            return new EstudianteHabilitacionResponse(e.getId(), e.getNombre(), e.getApellidos(), e.getCodigoSis(),
                    e.getCi(), facultades.getOrDefault(e.getId(), SIN_FACULTAD), estado, a.getMotivoInhabilitacion());
        }).toList();
    }

    private String nombreFacultad(EstudianteCarrera ec) {
        return ec.getCarrera().getFacultad().getNombre();
    }
}
