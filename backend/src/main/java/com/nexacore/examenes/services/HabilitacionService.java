package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ActualizarHabilitacionRequest;
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
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Habilitación de estudiantes en un examen (pestaña "Estudiantes habilitados").
 *
 * Trabaja sobre asistencia_examen: tener fila significa estar asociado al examen y
 * la columna habilitado decide el estado (false → NO_HABILITADO; true o null → HABILITADO,
 * igual que en el control de ingreso). Si el examen no existe responde 404.
 */
@Service
public class HabilitacionService {

    private static final String SIN_FACULTAD = "—";

    private final AsistenciaExamenRepository asistenciaExamenRepository;
    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final ExamenRepository examenRepository;

    public HabilitacionService(AsistenciaExamenRepository asistenciaExamenRepository,
                               EstudianteRepository estudianteRepository,
                               EstudianteCarreraRepository estudianteCarreraRepository,
                               ExamenRepository examenRepository) {
        this.asistenciaExamenRepository = asistenciaExamenRepository;
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.examenRepository = examenRepository;
    }

    @Transactional(readOnly = true)
    public List<EstudianteHabilitacionResponse> listar(Integer idExamen, Integer idParalelo) {
        verificarExamen(idExamen, idParalelo);
        return aRespuestas(asistenciaExamenRepository.listarDelExamen(idExamen, idParalelo));
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
        verificarExamen(idExamen, idParalelo);
        EstudianteExamenFila fila = estudianteRepository.identificarPorCodigoSis(buscado, idExamen)
                .or(() -> estudianteRepository.identificarPorCi(buscado, idExamen))
                .orElseThrow(() -> new EstudianteNoEncontradoException("código universitario o CI", buscado));
        if (fila.idExamen() != null) {
            throw new EstudianteDuplicadoException(
                    fila.nombre() + " " + fila.apellidos() + " ya está asociado a este examen");
        }

        AsistenciaExamenId id = new AsistenciaExamenId();
        id.setIdEstudiante(fila.idEstudiante());
        id.setIdExamen(idExamen);
        AsistenciaExamen asistencia = new AsistenciaExamen();
        asistencia.setId(id);
        asistencia.setIdParalelo(idParalelo);
        asistencia.setHabilitado(true);
        asistenciaExamenRepository.saveAndFlush(asistencia);
        return listar(idExamen, idParalelo);
    }

    /**
     * Cambia la habilitación de los estudiantes indicados; todos deben estar asociados al examen.
     *
     * @throws IllegalArgumentException si alguno no está asociado (400)
     */
    @Transactional
    public List<EstudianteHabilitacionResponse> actualizar(Integer idExamen, Integer idParalelo,
                                                           ActualizarHabilitacionRequest request) {
        verificarExamen(idExamen, idParalelo);
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
        return listar(idExamen, idParalelo);
    }

    private void verificarExamen(Integer idExamen, Integer idParalelo) {
        ExamenId id = new ExamenId();
        id.setIdExamen(idExamen);
        id.setIdParalelo(idParalelo);
        if (!examenRepository.existsById(id)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
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
