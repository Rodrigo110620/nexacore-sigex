package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.models.*;
import com.nexacore.examenes.repositories.CarreraRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.services.EstudianteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EstudianteServiceTests {
    @Mock EstudianteRepository estudianteRepository;
    @Mock EstudianteCarreraRepository estudianteCarreraRepository;
    @Mock CarreraRepository carreraRepository;
    private EstudianteService service;

    @BeforeEach
    void setUp() {
        service = new EstudianteService(estudianteRepository, estudianteCarreraRepository, carreraRepository);
    }

    private RegistrarEstudianteRequest request() {
        return new RegistrarEstudianteRequest("María", "González", "74892104",
            "maria@umss.edu", "202404012", 1, 10);
    }

    @Test
    void registraEstudianteYLoAsociaConSuCarrera() {
        Facultad facultad = new Facultad(); facultad.setId(1); facultad.setNombre("Tecnología");
        CarreraId id = new CarreraId(); id.setIdFacultad(1); id.setIdCarrera(10);
        Carrera carrera = new Carrera(); carrera.setId(id); carrera.setNombre("Ingeniería de Sistemas"); carrera.setFacultad(facultad);
        when(carreraRepository.findById(any())).thenReturn(Optional.of(carrera));
        when(estudianteRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            Estudiante estudiante = invocation.getArgument(0); estudiante.setId(99); return estudiante;
        });

        var response = service.registrar(request());

        assertEquals(99, response.id());
        assertEquals("202404012", response.codigoSis());
        assertEquals("Ingeniería de Sistemas", response.carreras().get(0).nombreCarrera());
        verify(estudianteCarreraRepository).save(argThat(ec -> ec.getId().getIdEstudiante().equals(99)));
    }

    @Test
    void rechazaCodigoUniversitarioDuplicado() {
        when(estudianteRepository.existsByCodigoSisIgnoreCase("202404012")).thenReturn(true);
        var error = assertThrows(EstudianteDuplicadoException.class, () -> service.registrar(request()));
        assertTrue(error.getMessage().contains("código SIS"));
        verify(estudianteRepository, never()).save(any());
    }

    @Test
    void rechazaCiDuplicado() {
        when(estudianteRepository.existsByCiIgnoreCase("74892104")).thenReturn(true);
        var error = assertThrows(EstudianteDuplicadoException.class, () -> service.registrar(request()));
        assertTrue(error.getMessage().contains("CI"));
    }

    @Test
    void rechazaCorreoDuplicado() {
        when(estudianteRepository.existsByEmailIgnoreCase("maria@umss.edu")).thenReturn(true);
        var error = assertThrows(EstudianteDuplicadoException.class, () -> service.registrar(request()));
        assertTrue(error.getMessage().contains("correo electrónico"));
        verify(estudianteRepository, never()).save(any());
    }

    @Test
    void rechazaCarreraQueNoPerteneceALaFacultad() {
        when(carreraRepository.findById(any())).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.registrar(request()));
        verify(estudianteRepository, never()).save(any());
    }
}
