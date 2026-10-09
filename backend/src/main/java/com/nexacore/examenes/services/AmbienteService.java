package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AmbienteDisponibilidadResponse;
import com.nexacore.examenes.dto.AmbienteResponse;
import com.nexacore.examenes.dto.CrearAmbienteRequest;
import com.nexacore.examenes.exceptions.AmbienteDuplicadoException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.utils.ValidacionPalabras;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class AmbienteService {

    private final AmbienteRepository ambienteRepository;
    private final ExamenRepository examenRepository;
    private final ExamenAulaRepository examenAulaRepository;

    public AmbienteService(AmbienteRepository ambienteRepository, ExamenRepository examenRepository,
                           ExamenAulaRepository examenAulaRepository) {
        this.ambienteRepository = ambienteRepository;
        this.examenRepository = examenRepository;
        this.examenAulaRepository = examenAulaRepository;
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

    @Transactional
    public AmbienteResponse actualizarAforo(Integer id, Integer capacidad) {
        Ambiente ambiente = ambienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));
        ambiente.setCapacidad(capacidad);
        return toResponse(ambienteRepository.save(ambiente));
    }

    private AmbienteResponse toResponse(Ambiente ambiente) {
        return new AmbienteResponse(ambiente.getId(), ambiente.getNombre(), ambiente.getUbicacion(),
                ambiente.getCapacidad(), ambiente.getPabellon());
    }

    /**
     * Todas las aulas con disponible=false si alguna está ocupada en ese horario, como aula principal
     * o adicional de otro examen. Dos consultas en total (exámenes del día y sus aulas adicionales),
     * en lugar de una por aula: con una base remota, 100+ consultas superaban el tiempo de espera.
     */
    @Transactional(readOnly = true)
    public List<AmbienteDisponibilidadResponse> disponibilidad(
            LocalDate fecha, LocalTime horaInicio, int duracionMinutos,
            Integer idExamenExcluido, Integer idParaleloExcluido) {
        LocalTime horaFin = horaInicio.plusMinutes(duracionMinutos);
        List<Examen> queSeCruzan = examenRepository.findVigentesEnFecha(fecha).stream()
                .filter(e -> !(e.getId().getIdExamen().equals(idExamenExcluido)
                        && e.getId().getIdParalelo().equals(idParaleloExcluido))) // el propio examen al editar
                .filter(e -> {
                    LocalTime ini = e.getHoraInicio();
                    return horaInicio.isBefore(ini.plusMinutes(e.getDuracionMinutos())) && ini.isBefore(horaFin);
                })
                .toList();
        Set<Integer> ocupadas = new HashSet<>();
        queSeCruzan.forEach(e -> ocupadas.add(e.getIdAmbiente()));
        if (!queSeCruzan.isEmpty()) {
            examenAulaRepository.adicionalesDe(queSeCruzan.stream().map(e -> e.getId().getIdExamen()).toList())
                    .forEach(ea -> ocupadas.add(ea.getId().getIdAmbiente()));
        }
        return ambienteRepository.findAllByOrderByNombreAsc().stream()
                .map(a -> new AmbienteDisponibilidadResponse(
                        a.getId(), a.getNombre(), a.getUbicacion(), a.getCapacidad(), a.getPabellon(),
                        !ocupadas.contains(a.getId())))
                .toList();
    }
}
