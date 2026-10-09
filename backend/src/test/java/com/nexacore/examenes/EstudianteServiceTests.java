package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.models.*;
import com.nexacore.examenes.repositories.CarreraRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.EstudianteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EstudianteServiceTests {
    @Mock EstudianteRepository estudianteRepository;
    @Mock EstudianteCarreraRepository estudianteCarreraRepository;
    @Mock CarreraRepository carreraRepository;
    @Mock UsuarioRepository usuarioRepository; 
    private EstudianteService service;

    @BeforeEach
    void setUp() {
        service = new EstudianteService(estudianteRepository, estudianteCarreraRepository, carreraRepository, usuarioRepository);
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
    void rechazaCiDuplicadoEnUsuarios() {
        when(usuarioRepository.existsByCiIgnoreCase("74892104")).thenReturn(true);
        var error = assertThrows(EstudianteDuplicadoException.class, () -> service.registrar(request()));
        assertTrue(error.getMessage().contains("usuario del sistema"));
        verify(estudianteRepository, never()).save(any());
    }

    @Test
    void rechazaCorreoDuplicadoEnUsuarios() {
        when(usuarioRepository.existsByEmailIgnoreCase("maria@umss.edu")).thenReturn(true);
        var error = assertThrows(EstudianteDuplicadoException.class, () -> service.registrar(request()));
        assertTrue(error.getMessage().contains("usuario del sistema"));
        verify(estudianteRepository, never()).save(any());
    }

    @Test
    void rechazaCarreraQueNoPerteneceALaFacultad() {
        when(carreraRepository.findById(any())).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.registrar(request()));
        verify(estudianteRepository, never()).save(any());
    }

    @Test
    void listarLimitaElTamanoDePaginaYCorrigeValoresInvalidos() {
        when(estudianteRepository.buscarConFiltros(any(), any(), any(), any())).thenReturn(Page.empty());

        service.listar(-3, 100_000, null, null, null);
        service.listar(0, 0, null, null, null);

        var paginas = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(estudianteRepository, times(2)).buscarConFiltros(any(), any(), any(), paginas.capture());
        assertEquals(0, paginas.getAllValues().get(0).getPageNumber());
        assertEquals(100, paginas.getAllValues().get(0).getPageSize());
        assertEquals(1, paginas.getAllValues().get(1).getPageSize());
    }

    @Test
    void listarNormalizaLosEspaciosDeLaBusqueda() {
        when(estudianteRepository.buscarConFiltros(any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.listar(0, 10, "  Juan    Pérez ", null, null);

        verify(estudianteRepository).buscarConFiltros(eq("Juan Pérez"), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void listarRechazaBusquedasDeMasDe40Caracteres() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.listar(0, 10, "x".repeat(41), null, null));

        assertTrue(error.getMessage().contains("40"));
        verify(estudianteRepository, never()).buscarConFiltros(any(), any(), any(), any(Pageable.class));
    }
}
