package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.MateriaConCarrerasResponse;
import com.nexacore.examenes.models.Carrera;
import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.MateriaCarrera;
import com.nexacore.examenes.repositories.CarreraRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.MateriaCarreraRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Plan de estudios (V63): a qué carreras pertenece cada materia. Evita mezclar materias con carreras que no les
 * corresponden: un estudiante de otra carrera no se agrega a mano a un examen de la materia. Una materia sin carreras
 * definidas no restringe a nadie.
 */
@Service
public class MateriaCarreraService {

    private final MateriaCarreraRepository repository;
    private final MateriaRepository materiaRepository;
    private final CarreraRepository carreraRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final AuditoriaService auditoriaService;

    public MateriaCarreraService(MateriaCarreraRepository repository, MateriaRepository materiaRepository,
                                 CarreraRepository carreraRepository, EstudianteCarreraRepository estudianteCarreraRepository,
                                 AuditoriaService auditoriaService) {
        this.repository = repository;
        this.materiaRepository = materiaRepository;
        this.carreraRepository = carreraRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.auditoriaService = auditoriaService;
    }

    /** Las materias con sus carreras, para la pantalla del administrador. */
    @Transactional(readOnly = true)
    public List<MateriaConCarrerasResponse> listar() {
        Map<Integer, Carrera> carreras = carreraRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getId().getIdCarrera(), c -> c));
        Map<Integer, List<Integer>> porMateria = new HashMap<>();
        for (MateriaCarrera mc : repository.findAll()) {
            porMateria.computeIfAbsent(mc.getId().getIdMateria(), k -> new ArrayList<>()).add(mc.getId().getIdCarrera());
        }
        // Oferta en el periodo activo: grupos y docentes de cada materia en ese semestre.
        Map<Integer, int[]> oferta = new HashMap<>();
        if (jdbc != null) {
            jdbc.query("SELECT p.id_materia, COUNT(*), COUNT(DISTINCT p.id_docente) FROM paralelo p WHERE "
                    + PeriodoService.delPeriodoActivo("p") + " GROUP BY p.id_materia", Map.of(),
                    rs -> { oferta.put(rs.getInt(1), new int[]{rs.getInt(2), rs.getInt(3)}); });
        }
        return materiaRepository.findAll().stream()
                .sorted(Comparator.comparing(Materia::getNombre, String.CASE_INSENSITIVE_ORDER))
                .map(m -> new MateriaConCarrerasResponse(m.getId(), m.getSigla(), m.getNombre(),
                        porMateria.getOrDefault(m.getId(), List.of()).stream()
                                .map(carreras::get).filter(java.util.Objects::nonNull)
                                .sorted(Comparator.comparing(Carrera::getNombre))
                                .map(c -> new MateriaConCarrerasResponse.CarreraDeMateria(c.getId().getIdCarrera(), c.getNombre()))
                                .toList(),
                        m.isActiva(), oferta.getOrDefault(m.getId(), new int[2])[0], oferta.getOrDefault(m.getId(), new int[2])[1],
                        m.isSiglaProvisional()))
                .toList();
    }

    /** Consultas de la oferta por periodo; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc;

    /** Deja la materia exactamente con esas carreras (vacío: sin restricción). */
    @Transactional
    public MateriaConCarrerasResponse asignar(Integer idMateria, Collection<Integer> idsCarrera) {
        Materia materia = materiaRepository.findById(idMateria)
                .orElseThrow(() -> new IllegalArgumentException("La materia no existe."));
        Set<Integer> pedidas = new LinkedHashSet<>(idsCarrera == null ? List.of() : idsCarrera);
        Map<Integer, Carrera> carreras = carreraRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getId().getIdCarrera(), c -> c));
        for (Integer id : pedidas) {
            if (!carreras.containsKey(id)) throw new IllegalArgumentException("Una de las carreras elegidas no existe.");
        }
        repository.borrarDeLaMateria(idMateria);
        repository.saveAll(pedidas.stream()
                .map(id -> new MateriaCarrera(idMateria, id, carreras.get(id).getId().getIdFacultad())).toList());
        auditoriaService.registrar("MATERIA_CARRERAS", Map.of("materia", materia.getNombre(),
                "carreras", pedidas.stream().map(id -> carreras.get(id).getNombre()).toList()));
        return listar().stream().filter(m -> m.idMateria().equals(idMateria)).findFirst().orElseThrow();
    }

    /**
     * Estudiantes (de los dados) que NO son de ninguna carrera de la materia. Vacío si la materia no tiene carreras
     * definidas. Un estudiante sin carrera registrada tampoco corresponde.
     */
    @Transactional(readOnly = true)
    public Set<Integer> deOtraCarrera(Integer idMateria, Collection<Integer> idsEstudiante) {
        Set<Integer> carrerasMateria = new HashSet<>(repository.idsCarrera(idMateria));
        if (carrerasMateria.isEmpty() || idsEstudiante.isEmpty()) return Set.of();
        Map<Integer, Set<Integer>> carrerasEstudiante = new HashMap<>();
        for (EstudianteCarrera ec : estudianteCarreraRepository.findByEstudianteIds(idsEstudiante)) {
            carrerasEstudiante.computeIfAbsent(ec.getId().getIdEstudiante(), k -> new HashSet<>())
                    .add(ec.getCarrera().getId().getIdCarrera());
        }
        Set<Integer> fuera = new LinkedHashSet<>();
        for (Integer id : idsEstudiante) {
            Set<Integer> suyas = carrerasEstudiante.getOrDefault(id, Set.of());
            if (suyas.stream().noneMatch(carrerasMateria::contains)) fuera.add(id);
        }
        return fuera;
    }

    @Transactional(readOnly = true)
    public List<Integer> idsCarrera(Integer idMateria) {
        return repository.idsCarrera(idMateria);
    }

    /** «Ing. de Sistemas, Ing. Informática»: las carreras de la materia, para los mensajes. */
    @Transactional(readOnly = true)
    public String carrerasTexto(Integer idMateria) {
        Set<Integer> ids = new HashSet<>(repository.idsCarrera(idMateria));
        return carreraRepository.findAll().stream().filter(c -> ids.contains(c.getId().getIdCarrera()))
                .map(Carrera::getNombre).sorted().collect(Collectors.joining(", "));
    }

    /** «Medicina» o «sin carrera registrada»: las carreras del estudiante, para los mensajes. */
    @Transactional(readOnly = true)
    public String carrerasDelEstudiante(Integer idEstudiante) {
        String texto = estudianteCarreraRepository.findByEstudianteIds(List.of(idEstudiante)).stream()
                .map(ec -> ec.getCarrera().getNombre()).sorted().collect(Collectors.joining(", "));
        return texto.isBlank() ? "sin carrera registrada" : texto;
    }
}
