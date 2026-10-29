package com.nexacore.examenes;

import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.repositories.*;
import com.nexacore.examenes.services.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReporteQrSisTests {
    @ParameterizedTest
    @ValueSource(strings = {"777777777", "000000000", "123456789", "121212121"})
    void sisFicticioNoGuardaReporte(String sis) {
        var repository = mock(ReporteQrDuplicadoRepository.class);
        var asistencias = mock(AsistenciaExamenRepository.class);
        var asistencia = new AsistenciaExamen();
        asistencia.setFechaHoraIngreso(LocalDateTime.now());
        when(asistencias.buscarContexto(10, 7)).thenReturn(Optional.of(asistencia));
        var service = new ReporteQrDuplicadoService(repository, asistencias, mock(UsuarioRepository.class),
                mock(EstudianteRepository.class), mock(NotificacionService.class), mock(SesionExamenService.class));
        assertThrows(IllegalArgumentException.class, () -> service.registrar(7, 10, "Ana Prueba", "74839201", true,
                sis, "Documento revisado por control", "2026-10-29T10:00:00-04:00", null, "control@umss.edu"));
        verifyNoInteractions(repository);
    }
}
