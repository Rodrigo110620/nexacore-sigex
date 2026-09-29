package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.CarreraResponse;
import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.models.Carrera;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.repositories.CarreraRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EstudianteService {

    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final CarreraRepository carreraRepository;

    public EstudianteService(
        EstudianteRepository estudianteRepository,
        EstudianteCarreraRepository estudianteCarreraRepository,
        CarreraRepository carreraRepository
    ) {
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.carreraRepository = carreraRepository;
    }

    public PageResponse<EstudianteListResponse> listar(
        int page, int size, String search, Integer idFacultad, Integer idCarrera
    ) {
        var pageable = PageRequest.of(page, size);
        Page<Estudiante> pagina = estudianteRepository.buscarConFiltros(
            search, idFacultad, idCarrera, pageable
        );

        return PageResponse.de(pagina.map(this::toResponse));
    }

    public List<CarreraResponse> listarCarreras(Integer idFacultad) {
        List<Carrera> carreras = (idFacultad != null)
            ? carreraRepository.findByIdIdFacultadOrderByNombreAsc(idFacultad)
            : carreraRepository.findAllByOrderByNombreAsc();

        return carreras.stream()
            .map(c -> new CarreraResponse(
                c.getId().getIdCarrera(),
                c.getNombre(),
                c.getCodigo(),
                c.getId().getIdFacultad(),
                c.getFacultad().getNombre()
            ))
            .toList();
    }

    private EstudianteListResponse toResponse(Estudiante e) {
        List<EstudianteCarrera> carreras = estudianteCarreraRepository
            .findByEstudianteId(e.getId());

        List<EstudianteListResponse.CarreraInfo> carrerasInfo = carreras.stream()
            .map(ec -> new EstudianteListResponse.CarreraInfo(
                ec.getCarrera().getId().getIdCarrera(),
                ec.getCarrera().getNombre(),
                ec.getCarrera().getId().getIdFacultad(),
                ec.getCarrera().getFacultad().getNombre()
            ))
            .toList();

        return new EstudianteListResponse(
            e.getId(),
            e.getCodigoSis(),
            e.getNombre(),
            e.getApellidos(),
            e.getCi(),
            e.getEmail(),
            carrerasInfo
        );
    }
}