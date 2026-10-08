package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AmbienteDisponibilidadResponse;
import com.nexacore.examenes.dto.AmbienteResponse;
import com.nexacore.examenes.dto.CrearAmbienteRequest;
import com.nexacore.examenes.exceptions.AmbienteDuplicadoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.utils.ValidacionPalabras;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AmbienteService {

    private final AmbienteRepository ambienteRepository;
    private final ExamenRepository examenRepository;

    public AmbienteService(AmbienteRepository ambienteRepository, ExamenRepository examenRepository) {
        this.ambienteRepository = ambienteRepository;
        this.examenRepository = examenRepository;
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
        if (!ValidacionPalabras.esCodigoDeAmbiente(nombre)) {
            throw new IllegalArgumentException("Usa un código de aula (ej. 692F, 682L0IN, L813) "
                    + "o un nombre abreviado que se pueda leer (ej. INFLAB, LABMAT)");
        }
        if (ambienteRepository.existsByNombreIgnoreCase(nombre)) {
            throw new AmbienteDuplicadoException(nombre);
        }
        Ambiente ambiente = new Ambiente();
        ambiente.setNombre(nombre);
        ambiente.setUbicacion(
                request.ubicacion() == null || request.ubicacion().isBlank()
                        ? "FCyT UMSS"
                        : request.ubicacion().trim());
        ambiente.setCapacidad(request.capacidad());
        ambiente.setPabellon(
                request.pabellon() == null || request.pabellon().isBlank() ? null : request.pabellon().trim());
        try {
            return toResponse(ambienteRepository.saveAndFlush(ambiente));
        } catch (DataIntegrityViolationException e) {
            // Otro usuario lo creó entre la verificación y el guardado (uq_ambiente_nombre).
            throw new AmbienteDuplicadoException(nombre);
        }
    }

    private AmbienteResponse toResponse(Ambiente ambiente) {
        return new AmbienteResponse(ambiente.getId(), ambiente.getNombre(), ambiente.getUbicacion(),
                ambiente.getCapacidad(), ambiente.getPabellon());
    }

    @Transactional(readOnly = true)
    public List<AmbienteDisponibilidadResponse> disponibilidad(
            LocalDate fecha, LocalTime horaInicio, int duracionMinutos,
            Integer idExamenExcluido, Integer idParaleloExcluido) {
        LocalTime horaFin = horaInicio.plusMinutes(duracionMinutos);
        return ambienteRepository.findAllByOrderByNombreAsc().stream()
                .map(a -> {
                    boolean ocupado = examenRepository
                            .findByAmbienteAndFecha(a.getId(), fecha)
                            .stream()
                            .filter(e -> {
                                if (idExamenExcluido != null && idParaleloExcluido != null
                                        && e.getId().getIdExamen().equals(idExamenExcluido)
                                        && e.getId().getIdParalelo().equals(idParaleloExcluido)) {
                                    return false; // excluir el propio examen al editar
                                }
                                LocalTime ini = e.getHoraInicio();
                                LocalTime fin = ini.plusMinutes(e.getDuracionMinutos());
                                return horaInicio.isBefore(fin) && ini.isBefore(horaFin);
                            })
                            .findAny()
                            .isPresent();
                    return new AmbienteDisponibilidadResponse(
                            a.getId(), a.getNombre(), a.getUbicacion(), a.getCapacidad(), a.getPabellon(), !ocupado);
                })
                .toList();
    }
}
