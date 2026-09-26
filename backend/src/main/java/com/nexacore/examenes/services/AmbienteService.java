package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AmbienteResponse;
import com.nexacore.examenes.dto.CrearAmbienteRequest;
import com.nexacore.examenes.exceptions.AmbienteDuplicadoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.repositories.AmbienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AmbienteService {

    private final AmbienteRepository ambienteRepository;

    public AmbienteService(AmbienteRepository ambienteRepository) {
        this.ambienteRepository = ambienteRepository;
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
        if (ambienteRepository.existsByNombreIgnoreCase(nombre)) {
            throw new AmbienteDuplicadoException(nombre);
        }
        Ambiente ambiente = new Ambiente();
        ambiente.setNombre(nombre);
        ambiente.setUbicacion(
                request.ubicacion() == null || request.ubicacion().isBlank()
                        ? "FCyT UMSS"
                        : request.ubicacion().trim());
        return toResponse(ambienteRepository.save(ambiente));
    }

    private AmbienteResponse toResponse(Ambiente ambiente) {
        return new AmbienteResponse(ambiente.getId(), ambiente.getNombre(), ambiente.getUbicacion());
    }
}
