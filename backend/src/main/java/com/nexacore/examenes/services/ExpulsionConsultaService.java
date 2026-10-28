package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ExpulsionResponse;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpulsionConsultaService {
    private final ExpulsionRepository expulsiones;
    private final UsuarioRepository usuarios;
    private final SesionExamenService sesiones;
    private final EstudianteRepository estudiantes;

    /** Una instantánea consistente del cierre, registros y responsables; sin consultas por fila. */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<ExpulsionResponse> listar(Integer idExamen) {
        var registros = expulsiones.deSesionActual(idExamen, sesiones.ultimoCierre(idExamen));
        if (registros.isEmpty()) return List.of();
        var responsables = usuarios.findAllById(registros.stream()
                        .flatMap(e -> java.util.stream.Stream.of(e.getIdUsuarioResponsable(), e.getIdUsuarioAnula()))
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Usuario::getId, u -> u));
        var expulsados = estudiantes.findAllById(registros.stream().map(e -> e.getIdEstudiante()).distinct().toList())
                .stream().collect(Collectors.toMap(Estudiante::getId, x -> x));
        return registros.stream().map(e -> {
            var responsable = responsables.get(e.getIdUsuarioResponsable());
            Estudiante est = expulsados.get(e.getIdEstudiante());
            return new ExpulsionResponse(e.getId(), e.getIdEstudiante(), e.getIdExamen(), e.getMotivo(),
                    responsable.getId(), responsable.getNombre() + " " + responsable.getApellidos(), e.getFechaHora(),
                    est == null ? null : (est.getNombre() + " " + est.getApellidos()).trim(), est == null ? null : est.getCodigoSis(),
                    e.getAnuladaEn(), nombreDe(responsables.get(e.getIdUsuarioAnula())), e.getMotivoAnulacion());
        }).toList();
    }

    private static String nombreDe(Usuario u) {
        return u == null ? null : u.getNombre() + " " + u.getApellidos();
    }
}
