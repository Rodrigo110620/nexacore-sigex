package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.EstudianteAsignadoResponse;
import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.exceptions.EstudianteNoEncontradoException;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.utils.ValidacionIdentificador;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Identificación del estudiante en el control de ingreso (HU ACCS-01).
 *
 * Busca por código universitario (estudiante.codigo_sis) o por CI (estudiante.ci)
 * y resuelve su estado en el examen según asistencia_examen:
 *   sin fila           → NO_VINCULADO
 *   habilitado = true  → HABILITADO
 *   false o null       → DESHABILITADO (null = pendiente de habilitación: tampoco puede ingresar)
 * También lista y resume los asignados al examen; si el examen no existe responde 404.
 */
@Service
public class IdentificacionService {

    /** Motivo que se muestra cuando el estudiante está asociado pero aún no fue habilitado ni deshabilitado. */
    public static final String MOTIVO_PENDIENTE = "Pendiente de habilitación";

    private static final int TAMANO_MAXIMO_PAGINA = 100;
    private static final Set<String> FILTROS_ESTADO = Set.of("TODOS", "HABILITADOS", "NO_HABILITADOS");

    private final EstudianteRepository estudianteRepository;
    private final ExamenRepository examenRepository;

    public IdentificacionService(EstudianteRepository estudianteRepository, ExamenRepository examenRepository) {
        this.estudianteRepository = estudianteRepository;
        this.examenRepository = examenRepository;
    }

    /**
     * @param tipo  "codigo" o "ci", sin distinguir mayúsculas
     * @param valor código universitario (9 dígitos) o CI (8 dígitos), sin espacios ni signos
     * @throws IllegalArgumentException        si el tipo no es válido o el valor no cumple su formato (400)
     * @throws ControlIngresoException         si el examen no existe (404)
     * @throws EstudianteNoEncontradoException si ningún estudiante tiene ese código o CI (404)
     */
    @Transactional(readOnly = true)
    public IdentificacionResponse identificar(Integer idExamen, String tipo, String valor) {
        String tipoBusqueda = tipo == null ? "" : tipo.trim().toLowerCase(Locale.ROOT);
        if (!tipoBusqueda.equals("codigo") && !tipoBusqueda.equals("ci")) {
            throw new IllegalArgumentException("El tipo de búsqueda debe ser 'codigo' o 'ci'");
        }
        if (tipoBusqueda.equals("codigo")) {
            ValidacionIdentificador.validarCodigoUniversitario(valor);
        } else {
            ValidacionIdentificador.validarCi(valor);
        }
        verificarExamen(idExamen);
        return tipoBusqueda.equals("codigo")
                ? responder(estudianteRepository.identificarPorCodigoSis(valor, idExamen), "código universitario", valor)
                : responder(estudianteRepository.identificarPorCi(valor, idExamen), "CI", valor);
    }

    /** Asignados al examen con el mismo PageResponse y límites de página que el listado de usuarios. */
    @Transactional(readOnly = true)
    public PageResponse<EstudianteAsignadoResponse> listarAsignados(Integer idExamen, String estado, int page, int size) {
        String filtro = estado == null || estado.isBlank() ? "TODOS" : estado.trim().toUpperCase(Locale.ROOT);
        if (!FILTROS_ESTADO.contains(filtro)) {
            throw new IllegalArgumentException("El estado debe ser TODOS, HABILITADOS o NO_HABILITADOS");
        }
        verificarExamen(idExamen);
        PageRequest pagina = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), TAMANO_MAXIMO_PAGINA));
        return PageResponse.de(estudianteRepository.listarAsignadosAlExamen(idExamen, filtro, pagina).map(this::aAsignado));
    }

    /** @throws ControlIngresoException si el examen no existe (404) */
    @Transactional(readOnly = true)
    public ResumenEstudiantesResponse resumir(Integer idExamen) {
        verificarExamen(idExamen);
        return estudianteRepository.resumirAsignadosAlExamen(idExamen);
    }

    private void verificarExamen(Integer idExamen) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
    }

    private IdentificacionResponse responder(Optional<EstudianteExamenFila> resultado, String campo, String valor) {
        EstudianteExamenFila fila = resultado.orElseThrow(() -> new EstudianteNoEncontradoException(campo, valor));
        IdentificacionResponse.Estado estado = estadoDe(fila);
        // fotoUrl queda en null: todavía no hay columna de foto en estudiante.
        return new IdentificacionResponse(fila.idEstudiante(), fila.nombre(), fila.apellidos(), fila.codigoSis(), fila.ci(),
                fila.carrera(), null, estado, motivoDe(fila, estado));
    }

    private EstudianteAsignadoResponse aAsignado(EstudianteExamenFila fila) {
        IdentificacionResponse.Estado estado = estadoDe(fila);
        return new EstudianteAsignadoResponse(fila.idEstudiante(), fila.nombre(), fila.apellidos(), fila.codigoSis(),
                fila.ci(), fila.carrera(), estado, motivoDe(fila, estado), fila.fechaHoraIngreso() != null);
    }

    private IdentificacionResponse.Estado estadoDe(EstudianteExamenFila fila) {
        if (fila.idExamen() == null) {
            return IdentificacionResponse.Estado.NO_VINCULADO;
        }
        return Boolean.TRUE.equals(fila.habilitado())
                ? IdentificacionResponse.Estado.HABILITADO
                : IdentificacionResponse.Estado.DESHABILITADO;
    }

    /** El motivo solo se expone si el estudiante está DESHABILITADO; si está pendiente, se indica así. */
    private String motivoDe(EstudianteExamenFila fila, IdentificacionResponse.Estado estado) {
        if (estado != IdentificacionResponse.Estado.DESHABILITADO) {
            return null;
        }
        return fila.habilitado() == null ? MOTIVO_PENDIENTE : fila.motivoInhabilitacion();
    }
}
