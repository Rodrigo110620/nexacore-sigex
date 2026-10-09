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
import java.util.List;
import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
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
        when(intentoRepository.existeRegistroReciente(7, 23)).thenReturn(false);
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

    @Test
    void rechazaDuplicadoInmediatoSinInsertarOtraFila() {
        when(examenRepository.existsByIdIdExamen(7)).thenReturn(true);
        when(estudianteRepository.findById(23)).thenReturn(Optional.of(new com.nexacore.examenes.models.Estudiante()));
        when(asistenciaRepository.buscarContexto(23, 7)).thenReturn(Optional.empty());
        when(intentoRepository.existeRegistroReciente(7, 23)).thenReturn(true);

        ControlIngresoException error = assertThrows(ControlIngresoException.class,
                () -> service.registrar(request, "control@umss.edu.bo"));

        org.junit.jupiter.api.Assertions.assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(intentoRepository, never()).registrar(anyInt(), anyInt(), anyInt(), anyString(), anyString());
    }

    @Test
    void consultaYMapeaMultiplesIntentosDelExamenEnElOrdenDelRepositorio() {
        when(examenRepository.existsByIdIdExamen(7)).thenReturn(true);
        LocalDateTime reciente = LocalDateTime.parse("2026-10-08T14:00:00");
        LocalDateTime anterior = LocalDateTime.parse("2026-10-08T13:30:00");
        when(intentoRepository.listar(7, null)).thenReturn(List.of(
                new Object[]{2, 7, 23, "Ana Pérez", "202600001", "202600001", "Examen no asignado", "Carla Control", reciente},
                new Object[]{1, 7, 24, "Luis Flores", "202600002", "74839201", "No estaba habilitado", "Diego Control", anterior}
        ));

        var historial = service.listar(7, null);

        org.junit.jupiter.api.Assertions.assertEquals(2, historial.size());
        org.junit.jupiter.api.Assertions.assertEquals(2, historial.get(0).idIntento());
        org.junit.jupiter.api.Assertions.assertEquals("Ana Pérez", historial.get(0).estudiante());
        org.junit.jupiter.api.Assertions.assertEquals("202600001", historial.get(0).codigoSis());
        org.junit.jupiter.api.Assertions.assertEquals("Carla Control", historial.get(0).personalControl());
        org.junit.jupiter.api.Assertions.assertEquals(reciente, historial.get(0).fechaHora());
        org.junit.jupiter.api.Assertions.assertEquals(1, historial.get(1).idIntento());
        org.junit.jupiter.api.Assertions.assertEquals("Luis Flores", historial.get(1).estudiante());
        org.junit.jupiter.api.Assertions.assertEquals(anterior, historial.get(1).fechaHora());
        verify(intentoRepository).listar(7, null);
    }
}
