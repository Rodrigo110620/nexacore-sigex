package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ActualizarHabilitacionRequest;
import com.nexacore.examenes.dto.AsociacionLoteResponse;
import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.EstudianteHabilitacionResponse;
import com.nexacore.examenes.dto.RepartoAulasResponse;
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
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import com.nexacore.examenes.utils.ValidacionPalabras;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Habilitación de estudiantes en un examen (pestaña "Estudiantes habilitados").
 *
 * Trabaja sobre asistencia_examen: tener fila significa estar asociado al examen y
 * la columna habilitado decide el estado (true → HABILITADO; false → NO_HABILITADO;
 * null → PENDIENTE, el estado con el que queda al asociarse). Si el examen no existe responde 404.
 *
 * Asociar también inscribe al estudiante en el paralelo del examen (misma materia y
 * docente) si aún no lo estaba, para que inscripcion_paralelo refleje quién rinde.
 */
@Service
public class HabilitacionService {

    private static final String SIN_FACULTAD = "—";
    static final int RAZON_MIN = 10;
    static final int RAZON_MAX = 40;
    /** Solo palabras: letras (con tildes y ñ) y espacios simples. */
    private static final Pattern RAZON_CARACTERES = Pattern.compile("[\\p{L} ]+");

    private final AsistenciaExamenRepository asistenciaExamenRepository;
    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final ExamenRepository examenRepository;
    private final InscripcionParaleloRepository inscripcionParaleloRepository;
    private final UsuarioRepository usuarioRepository;
    private final RepartoAulasService repartoAulasService;

    public HabilitacionService(AsistenciaExamenRepository asistenciaExamenRepository,
                               EstudianteRepository estudianteRepository,
                               EstudianteCarreraRepository estudianteCarreraRepository,
                               ExamenRepository examenRepository,
                               InscripcionParaleloRepository inscripcionParaleloRepository,
                               UsuarioRepository usuarioRepository,
                               RepartoAulasService repartoAulasService) {
        this.asistenciaExamenRepository = asistenciaExamenRepository;
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.examenRepository = examenRepository;
        this.inscripcionParaleloRepository = inscripcionParaleloRepository;
        this.usuarioRepository = usuarioRepository;
        this.repartoAulasService = repartoAulasService;
    }

    @Transactional(readOnly = true)
    public List<EstudianteHabilitacionResponse> listar(Integer idExamen, Integer idParalelo) {
        Examen examen = buscarExamen(idExamen, idParalelo);
        if (SesionActual.esSoloDocente() && !esDelDocenteActual(examen)) {
            throw new AccessDeniedException("El examen no está asignado a este docente");
        }
        return listarSinVerificar(idExamen, idParalelo);
    }

    /** Cuántos van a cada aula del examen y cuántos no entran, según el reparto alfabético. */
    @Transactional(readOnly = true)
    public RepartoAulasResponse reparto(Integer idExamen, Integer idParalelo) {
        Examen examen = buscarExamen(idExamen, idParalelo);
        if (SesionActual.esSoloDocente() && !esDelDocenteActual(examen)) {
            throw new AccessDeniedException("El examen no está asignado a este docente");
        }
        RepartoAulasService.Reparto reparto = repartoAulasService.repartir(
                examen, asistenciaExamenRepository.listarDelExamen(idExamen, idParalelo));
        List<RepartoAulasResponse.OcupacionAula> aulas = reparto.aulas().stream()
                .map(a -> new RepartoAulasResponse.OcupacionAula(a.idAmbiente(), a.nombre(), a.capacidad(), a.orden(),
                        reparto.asignados().getOrDefault(a.idAmbiente(), 0)))
                .toList();
        return new RepartoAulasResponse(aulas, reparto.sinAula().size());
    }

    private boolean esDelDocenteActual(Examen examen) {
        return usuarioRepository.findByEmail(SesionActual.email())
                .map(usuario -> usuario.getId().equals(examen.getIdDocente()))
                .orElse(false);
    }

    /**
     * Asocia al examen al estudiante con ese código universitario o CI, pendiente de habilitación.
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
        Examen examen = buscarExamenEditable(idExamen, idParalelo);
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
        Examen examen = buscarExamenEditable(idExamen, idParalelo);
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
        Examen examen = buscarExamenEditable(idExamen, idParalelo);
        Set<Integer> nuevos = new LinkedHashSet<>(inscripcionParaleloRepository.idsInscritos(
                idParalelo, examen.getIdMateria(), examen.getIdDocente()));
        nuevos.removeAll(asistenciaExamenRepository.idsEstudiantesDelExamen(idExamen));
        registrar(examen, nuevos);
        return new AsociacionLoteResponse(nuevos.size(), List.of(), List.of(),
                listarSinVerificar(idExamen, idParalelo));
    }

    /**
     * Cambia la habilitación de los estudiantes indicados; todos deben estar asociados al examen.
     * NO_HABILITADO exige una razón válida; HABILITADO y PENDIENTE la descartan.
     *
     * @throws IllegalArgumentException si falta el motivo o alguno no está asociado (400)
     */
    @Transactional
    public List<EstudianteHabilitacionResponse> actualizar(Integer idExamen, Integer idParalelo,
                                                           ActualizarHabilitacionRequest request) {
        EstadoHabilitacion estado = request.estadoHabilitacion();
        // Solo NO_HABILITADO guarda razón: habilitar o dejar pendiente la limpia.
        String motivo = null;
        if (estado == EstadoHabilitacion.NO_HABILITADO) {
            validarRazon(request.motivo());
            motivo = request.motivo();
        }
        buscarExamenEditable(idExamen, idParalelo);
        Set<Integer> ids = new HashSet<>(request.idsEstudiante());
        List<AsistenciaExamen> asistencias = asistenciaExamenRepository.buscarDelExamen(idExamen, idParalelo, ids);
        if (asistencias.size() != ids.size()) {
            throw new IllegalArgumentException("Algunos estudiantes seleccionados no están asociados a este examen");
        }
        Boolean habilitado = estado == EstadoHabilitacion.PENDIENTE ? null : estado == EstadoHabilitacion.HABILITADO;
        for (AsistenciaExamen asistencia : asistencias) {
            asistencia.setHabilitado(habilitado);
            asistencia.setMotivoInhabilitacion(motivo);
        }
        asistenciaExamenRepository.saveAllAndFlush(asistencias);
        return listarSinVerificar(idExamen, idParalelo);
    }

    /**
     * Inscribe en el paralelo del examen a quienes no lo estén y los asocia al examen pendientes de habilitación.
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
            // habilitado queda en null: PENDIENTE hasta que se habilite o deshabilite.
            asistencias.add(asistencia);
        }
        inscripcionParaleloRepository.saveAll(inscripciones);
        asistenciaExamenRepository.saveAllAndFlush(asistencias);
    }

    /**
     * Razón de inhabilitación: obligatoria, 10 a 40 caracteres, solo letras, números y espacios,
     * sin espacios al inicio, al final ni consecutivos. Se rechaza en vez de corregirse.
     */
    static void validarRazon(String razon) {
        if (razon == null || razon.isBlank()) {
            throw new IllegalArgumentException("Indique la razón por la que el estudiante no está habilitado");
        }
        if (!razon.equals(razon.strip())) {
            throw new IllegalArgumentException("La razón no puede tener espacios al inicio ni al final");
        }
        if (razon.contains("  ")) {
            throw new IllegalArgumentException("La razón no puede tener espacios consecutivos");
        }
        if (!RAZON_CARACTERES.matcher(razon).matches()) {
            throw new IllegalArgumentException("La razón solo admite palabras: letras, espacios, tildes y ñ");
        }
        if (!Character.isUpperCase(razon.codePointAt(0))) {
            throw new IllegalArgumentException("La razón debe empezar con mayúscula");
        }
        if (razon.length() < RAZON_MIN || razon.length() > RAZON_MAX) {
            throw new IllegalArgumentException(
                    "La razón debe tener entre " + RAZON_MIN + " y " + RAZON_MAX + " caracteres");
        }
        for (String palabra : razon.split(" ")) {
            if (!ValidacionPalabras.pareceUnaPalabra(palabra)) {
                throw new IllegalArgumentException(
                        "\"" + palabra + "\" no parece una palabra. Escribe la razón con palabras reales");
            }
        }
    }

    /** Un examen cancelado o finalizado ya no admite asociaciones ni cambios de habilitación (409). */
    private Examen buscarExamenEditable(Integer idExamen, Integer idParalelo) {
        Examen examen = buscarExamen(idExamen, idParalelo);
        String estado = examen.getEstado() == null ? "programado" : examen.getEstado().toLowerCase();
        if (estado.equals("cancelado") || estado.equals("finalizado")) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "El examen está " + estado + " y no admite cambios de habilitación");
        }
        return examen;
    }

    private Examen buscarExamen(Integer idExamen, Integer idParalelo) {
        ExamenId id = new ExamenId();
        id.setIdExamen(idExamen);
        id.setIdParalelo(idParalelo);
        return examenRepository.findById(id).orElseThrow(
                () -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen));
    }

    private List<EstudianteHabilitacionResponse> listarSinVerificar(Integer idExamen, Integer idParalelo) {
        return aRespuestas(buscarExamen(idExamen, idParalelo),
                asistenciaExamenRepository.listarDelExamen(idExamen, idParalelo));
    }

    private List<EstudianteHabilitacionResponse> aRespuestas(Examen examen, List<AsistenciaExamen> asistencias) {
        if (asistencias.isEmpty()) {
            return List.of();
        }
        RepartoAulasService.Reparto reparto = repartoAulasService.repartir(examen, asistencias);
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
            EstadoHabilitacion estado = a.getHabilitado() == null
                    ? EstadoHabilitacion.PENDIENTE
                    : a.getHabilitado() ? EstadoHabilitacion.HABILITADO : EstadoHabilitacion.NO_HABILITADO;
            RepartoAulasService.Aula aula = reparto.aulaDe(e.getId());
            return new EstudianteHabilitacionResponse(e.getId(), e.getNombre(), e.getApellidos(), e.getCodigoSis(),
                    e.getCi(), facultades.getOrDefault(e.getId(), SIN_FACULTAD), estado, a.getMotivoInhabilitacion(),
                    aula != null ? aula.nombre() : null);
        }).toList();
    }

    private String nombreFacultad(EstudianteCarrera ec) {
        return ec.getCarrera().getFacultad().getNombre();
    }
}
