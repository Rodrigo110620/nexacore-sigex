package com.nexacore.examenes;

import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.exceptions.EstudianteNoEncontradoException;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.IdentificacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de IdentificacionService (HU ACCS-01), con el repositorio simulado.
 */
@ExtendWith(MockitoExtension.class)
class IdentificacionServiceTests {

    private static final int ID_EXAMEN = 7;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private IdentificacionService identificacionService;

    /** Una fila sin idExamen significa que el LEFT JOIN no encontró asistencia para ese examen. */
    @ParameterizedTest(name = "idExamen={0}, habilitado={1} -> {2}")
    @CsvSource({
            "7, true,  HABILITADO",
            "7, false, DESHABILITADO",
            "7,     ,  HABILITADO",
            " ,     ,  NO_VINCULADO"
    })
    void resuelveElEstadoSegunLaHabilitacionEnElExamen(Integer idExamen, Boolean habilitado,
                                                       IdentificacionResponse.Estado esperado) {
        when(usuarioRepository.identificarPorCi("7845123", ID_EXAMEN)).thenReturn(Optional.of(
                new EstudianteExamenFila("Zoe", "Quispe Luna", "201901234", "7845123", idExamen, habilitado)));

        // tipo y valor llegan con espacios y mayúsculas, como podría enviarlos el formulario
        IdentificacionResponse respuesta = identificacionService.identificar(ID_EXAMEN, " CI ", " 7845123 ");

        assertEquals(esperado, respuesta.estado());
        assertEquals("Zoe", respuesta.nombre());
        assertEquals("201901234", respuesta.codigoSis());
        assertNull(respuesta.fotoUrl());
    }

    @Test
    void rechazaEstudianteInexistenteYTipoInvalido() {
        when(usuarioRepository.identificarPorCodigoSis("209999999", ID_EXAMEN)).thenReturn(Optional.empty());

        EstudianteNoEncontradoException noEncontrado = assertThrows(EstudianteNoEncontradoException.class,
                () -> identificacionService.identificar(ID_EXAMEN, "codigo", "209999999"));
        assertEquals("No se encontró ningún estudiante con código universitario 209999999",
                noEncontrado.getMessage());

        assertThrows(IllegalArgumentException.class,
                () -> identificacionService.identificar(ID_EXAMEN, "qr", "209999999"));
        assertThrows(IllegalArgumentException.class,
                () -> identificacionService.identificar(ID_EXAMEN, "ci", "   "));
    }
}
