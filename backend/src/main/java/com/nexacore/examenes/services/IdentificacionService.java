package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.EstudianteAsignadoResponse;
import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.exceptions.EstudianteNoEncontradoException;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
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
 * Busca por código universitario (estudiante.codigo_sis) o por CI (usuario.ci)
 * y resuelve su estado en el examen según asistencia_examen:
 *   sin fila           → NO_VINCULADO
 *   habilitado = false → DESHABILITADO
 *   true o null        → HABILITADO (null respeta el DEFAULT true de la columna)
 * También lista y resume los asignados al examen; si el examen no existe responde 404.
 */
@Service
public class IdentificacionService {

    private static final int TAMANO_MAXIMO_PAGINA = 100;
    private static final Set<String> FILTROS_ESTADO = Set.of("TODOS", "HABILITADOS", "NO_HABILITADOS");

    private final UsuarioRepository usuarioRepository;
    private final ExamenRepository examenRepository;

    public IdentificacionService(UsuarioRepository usuarioRepository, ExamenRepository examenRepository) {
        this.usuarioRepository = usuarioRepository;
        this.examenRepository = examenRepository;
    }

    /**
     * @param tipo  "codigo" o "ci", sin distinguir mayúsculas
     * @param valor código universitario o CI; se ignoran los espacios de los extremos
     * @throws IllegalArgumentException        si el tipo no es válido o el valor está vacío (400)
     * @throws ControlIngresoException         si el examen no existe (404)
     * @throws EstudianteNoEncontradoException si ningún estudiante tiene ese código o CI (404)
     */
    @Transactional(readOnly = true)
    public IdentificacionResponse identificar(Integer idExamen, String tipo, String valor) {
        String buscado = valor == null ? "" : valor.trim();
        if (buscado.isEmpty()) {
            throw new IllegalArgumentException("Ingrese el código universitario o el CI del estudiante");
        }
        String tipoBusqueda = tipo == null ? "" : tipo.trim().toLowerCase(Locale.ROOT);
        if (!tipoBusqueda.equals("codigo") && !tipoBusqueda.equals("ci")) {
            throw new IllegalArgumentException("El tipo de búsqueda debe ser 'codigo' o 'ci'");
        }
        verificarExamen(idExamen);
        return tipoBusqueda.equals("codigo")
                ? responder(usuarioRepository.identificarPorCodigoSis(buscado, idExamen), "código universitario", buscado)
                : responder(usuarioRepository.identificarPorCi(buscado, idExamen), "CI", buscado);
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
        return PageResponse.de(usuarioRepository.listarAsignadosAlExamen(idExamen, filtro, pagina).map(this::aAsignado));
    }

    /** @throws ControlIngresoException si el examen no existe (404) */
    @Transactional(readOnly = true)
    public ResumenEstudiantesResponse resumir(Integer idExamen) {
        verificarExamen(idExamen);
        return usuarioRepository.resumirAsignadosAlExamen(idExamen);
    }

    private void verificarExamen(Integer idExamen) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
    }

    private IdentificacionResponse responder(Optional<EstudianteExamenFila> resultado, String campo, String valor) {
        EstudianteExamenFila fila = resultado.orElseThrow(() -> new EstudianteNoEncontradoException(campo, valor));
        IdentificacionResponse.Estado estado = estadoDe(fila);
        // fotoUrl queda en null: todavía no hay columna de foto en usuario ni en estudiante.
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
        return Boolean.FALSE.equals(fila.habilitado())
                ? IdentificacionResponse.Estado.DESHABILITADO
                : IdentificacionResponse.Estado.HABILITADO;
    }

    /** El motivo solo se expone si el estudiante está DESHABILITADO. */
    private String motivoDe(EstudianteExamenFila fila, IdentificacionResponse.Estado estado) {
        return estado == IdentificacionResponse.Estado.DESHABILITADO ? fila.motivoInhabilitacion() : null;
    }
}
