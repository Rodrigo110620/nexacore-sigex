package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarIntentoIngresoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.*;
import com.nexacore.examenes.services.IntentoIngresoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IntentoIngresoServiceTests {
    @Mock IntentoIngresoRepository intentoRepository;
    @Mock EstudianteRepository estudianteRepository;
    @Mock ExamenRepository examenRepository;
    @Mock AsistenciaExamenRepository asistenciaRepository;
    @Mock UsuarioRepository usuarioRepository;
    @InjectMocks IntentoIngresoService service;

    private final RegistrarIntentoIngresoRequest request =
            new RegistrarIntentoIngresoRequest(7, 23, "202600001", "Intentó ingresar a un examen no asignado");

    @Test
    void registraSoloSiElEstudianteNoEstaAsociadoAlExamen() {
        Usuario control = new Usuario(); control.setId(5);
        when(examenRepository.existsByIdIdExamen(7)).thenReturn(true);
        when(estudianteRepository.findById(23)).thenReturn(Optional.of(new com.nexacore.examenes.models.Estudiante()));
        when(asistenciaRepository.buscarContexto(23, 7)).thenReturn(Optional.empty());
        when(usuarioRepository.findByEmail("control@umss.edu.bo")).thenReturn(Optional.of(control));
        when(intentoRepository.registrar(eq(7), eq(23), eq(5), anyString(), anyString())).thenReturn(1);

        assertDoesNotThrow(() -> service.registrar(request, "control@umss.edu.bo"));
        verify(intentoRepository).registrar(7, 23, 5, "202600001", request.motivo());
    }

    @Test
    void rechazaRegistrarIntentoSiElEstudianteYaEstaAsociado() {
        when(examenRepository.existsByIdIdExamen(7)).thenReturn(true);
        when(estudianteRepository.findById(23)).thenReturn(Optional.of(new com.nexacore.examenes.models.Estudiante()));
        when(asistenciaRepository.buscarContexto(23, 7)).thenReturn(Optional.of(mock(com.nexacore.examenes.models.AsistenciaExamen.class)));

        assertThrows(ControlIngresoException.class, () -> service.registrar(request, "control@umss.edu.bo"));
        verifyNoInteractions(intentoRepository);
    }
}
