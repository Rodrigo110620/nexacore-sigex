package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ExpulsionResponse;
import com.nexacore.examenes.models.Usuario;
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

    /** Una instantánea consistente del cierre, registros y responsables; sin consultas por fila. */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<ExpulsionResponse> listar(Integer idExamen) {
        var registros = expulsiones.deSesionActual(idExamen, sesiones.ultimoCierre(idExamen));
        if (registros.isEmpty()) return List.of();
        var responsables = usuarios.findAllById(registros.stream().map(e -> e.getIdUsuarioResponsable()).distinct().toList())
                .stream().collect(Collectors.toMap(Usuario::getId, u -> u));
        return registros.stream().map(e -> {
            var responsable = responsables.get(e.getIdUsuarioResponsable());
            return new ExpulsionResponse(e.getId(), e.getIdEstudiante(), e.getIdExamen(), e.getMotivo(),
                    responsable.getId(), responsable.getNombre() + " " + responsable.getApellidos(), e.getFechaHora());
        }).toList();
    }
}
