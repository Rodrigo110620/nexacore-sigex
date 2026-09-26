package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.exceptions.EstudianteNoEncontradoException;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

/**
 * Identificación del estudiante en el control de ingreso (HU ACCS-01).
 *
 * Busca por código universitario (estudiante.codigo_sis) o por CI (usuario.ci)
 * y resuelve su estado en el examen según asistencia_examen:
 *   sin fila           → NO_VINCULADO
 *   habilitado = false → DESHABILITADO
 *   true o null        → HABILITADO (null respeta el DEFAULT true de la columna)
 */
@Service
public class IdentificacionService {

    private final UsuarioRepository usuarioRepository;

    public IdentificacionService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * @param tipo  "codigo" o "ci", sin distinguir mayúsculas
     * @param valor código universitario o CI; se ignoran los espacios de los extremos
     * @throws IllegalArgumentException        si el tipo no es válido o el valor está vacío (400)
     * @throws EstudianteNoEncontradoException si ningún estudiante tiene ese código o CI (404)
     */
    @Transactional(readOnly = true)
    public IdentificacionResponse identificar(Integer idExamen, String tipo, String valor) {
        String buscado = valor == null ? "" : valor.trim();
        if (buscado.isEmpty()) {
            throw new IllegalArgumentException("Ingrese el código universitario o el CI del estudiante");
        }
        String tipoBusqueda = tipo == null ? "" : tipo.trim().toLowerCase(Locale.ROOT);
        return switch (tipoBusqueda) {
            case "codigo" -> responder(usuarioRepository.identificarPorCodigoSis(buscado, idExamen),
                    "código universitario", buscado);
            case "ci" -> responder(usuarioRepository.identificarPorCi(buscado, idExamen), "CI", buscado);
            default -> throw new IllegalArgumentException("El tipo de búsqueda debe ser 'codigo' o 'ci'");
        };
    }

    private IdentificacionResponse responder(Optional<EstudianteExamenFila> resultado, String campo, String valor) {
        EstudianteExamenFila fila = resultado.orElseThrow(() -> new EstudianteNoEncontradoException(campo, valor));
        // fotoUrl queda en null: todavía no hay columna de foto en usuario ni en estudiante.
        return new IdentificacionResponse(fila.nombre(), fila.apellidos(), fila.codigoSis(), fila.ci(),
                null, estadoDe(fila));
    }

    private IdentificacionResponse.Estado estadoDe(EstudianteExamenFila fila) {
        if (fila.idExamen() == null) {
            return IdentificacionResponse.Estado.NO_VINCULADO;
        }
        return Boolean.FALSE.equals(fila.habilitado())
                ? IdentificacionResponse.Estado.DESHABILITADO
                : IdentificacionResponse.Estado.HABILITADO;
    }
}
