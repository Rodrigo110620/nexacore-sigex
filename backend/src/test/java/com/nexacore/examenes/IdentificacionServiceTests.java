package com.nexacore.examenes;

import com.nexacore.examenes.dto.EstudianteAsignadoResponse;
import com.nexacore.examenes.dto.EstudianteExamenFila;
import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.exceptions.EstudianteNoEncontradoException;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.services.IdentificacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.nexacore.examenes.dto.IdentificacionResponse.Estado.DESHABILITADO;
import static com.nexacore.examenes.dto.IdentificacionResponse.Estado.HABILITADO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de IdentificacionService (HU ACCS-01), con el repositorio simulado.
 */
@ExtendWith(MockitoExtension.class)
class IdentificacionServiceTests {

    private static final int ID_EXAMEN = 7;

    @Mock
    private EstudianteRepository estudianteRepository;

    @Mock
    private ExamenRepository examenRepository;

    @InjectMocks
    private IdentificacionService identificacionService;

    private static EstudianteExamenFila fila(Integer idExamen, Boolean habilitado, LocalDateTime ingreso) {
        return new EstudianteExamenFila(23, "Zoe", "Quispe Luna", "201901234", "7845123",
                "Ingeniería de Sistemas", idExamen, habilitado, "Deuda en biblioteca", ingreso);
    }

    /** Una fila sin idExamen significa que el LEFT JOIN no encontró asistencia para ese examen. */
    @ParameterizedTest(name = "idExamen={0}, habilitado={1} -> {2}")
    @CsvSource({
            "7, true,  HABILITADO",
            "7, false, DESHABILITADO",
            "7,     ,  DESHABILITADO",
            " ,     ,  NO_VINCULADO"
    })
    void resuelveElEstadoSegunLaHabilitacionEnElExamen(Integer idExamen, Boolean habilitado,
                                                       IdentificacionResponse.Estado esperado) {
        when(examenRepository.existsByIdIdExamen(ID_EXAMEN)).thenReturn(true);
        when(estudianteRepository.identificarPorCi("78451236", ID_EXAMEN)).thenReturn(Optional.of(fila(idExamen, habilitado, null)));

        // el tipo puede llegar con espacios y mayúsculas; el valor ya llega validado (8 dígitos)
        IdentificacionResponse respuesta = identificacionService.identificar(ID_EXAMEN, " CI ", "78451236");

        assertEquals(esperado, respuesta.estado());
        assertEquals(23, respuesta.idEstudiante());
        assertEquals("Zoe", respuesta.nombre());
        assertEquals("201901234", respuesta.codigoSis());
        assertEquals("Ingeniería de Sistemas", respuesta.carrera());
        // Sin decisión (habilitado null) está pendiente: se informa así en vez del motivo guardado.
        String motivoEsperado = esperado != DESHABILITADO ? null
                : habilitado == null ? IdentificacionService.MOTIVO_PENDIENTE : "Deuda en biblioteca";
        assertEquals(motivoEsperado, respuesta.motivoInhabilitacion());
        assertNull(respuesta.fotoUrl());
    }

    @Test
    void rechazaEstudianteInexistenteYTipoInvalido() {
        when(examenRepository.existsByIdIdExamen(ID_EXAMEN)).thenReturn(true);
        when(estudianteRepository.identificarPorCodigoSis("209999999", ID_EXAMEN)).thenReturn(Optional.empty());

        EstudianteNoEncontradoException noEncontrado = assertThrows(EstudianteNoEncontradoException.class,
                () -> identificacionService.identificar(ID_EXAMEN, "codigo", "209999999"));
        assertEquals("No se encontró ningún estudiante con código universitario 209999999",
                noEncontrado.getMessage());

        assertThrows(IllegalArgumentException.class,
                () -> identificacionService.identificar(ID_EXAMEN, "qr", "209999999"));
        assertThrows(IllegalArgumentException.class,
                () -> identificacionService.identificar(ID_EXAMEN, "ci", "   "));
    }

    /** BUG-A01: con un valor fuera de formato no se consulta el examen ni se busca al estudiante. */
    @ParameterizedTest(name = "{0}={1} -> {2}")
    @CsvSource(delimiter = '|', value = {
            "codigo | 20190123A | El código universitario no puede contener letras",
            "codigo | 121212121 | El código universitario no puede ser un patrón repetido",
            "ci     | 7845123   | El C.I. debe tener exactamente 8 dígitos",
            "ci     | 7845.123  | El C.I. no puede contener puntos, comas ni caracteres especiales"
    })
    void noBuscaSiElValorNoCumpleElFormato(String tipo, String valor, String mensaje) {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> identificacionService.identificar(ID_EXAMEN, tipo, valor));

        assertEquals(mensaje, error.getMessage());
        verifyNoInteractions(examenRepository, estudianteRepository);
    }

    @Test
    void listaAsignadosConPendienteComoNoHabilitadoYLosLimitesDePaginaDeUsuarios() {
        PageRequest pagina = PageRequest.of(0, 100);
        when(examenRepository.existsByIdIdExamen(ID_EXAMEN)).thenReturn(true);
        when(estudianteRepository.listarAsignadosAlExamen(ID_EXAMEN, "TODOS", pagina)).thenReturn(new PageImpl<>(
                List.of(fila(ID_EXAMEN, false, LocalDateTime.now()), fila(ID_EXAMEN, null, null)), pagina, 2));

        // estado null → TODOS; página negativa → 0; tamaño mayor a 100 → 100
        PageResponse<EstudianteAsignadoResponse> respuesta = identificacionService.listarAsignados(ID_EXAMEN, null, -1, 500);

        assertEquals(2, respuesta.totalRegistros());
        EstudianteAsignadoResponse deshabilitado = respuesta.contenido().get(0);
        assertEquals(DESHABILITADO, deshabilitado.estado());
        assertEquals("Deuda en biblioteca", deshabilitado.motivoInhabilitacion());
        assertTrue(deshabilitado.ingresado());
        // habilitado null = pendiente de habilitación: no puede ingresar y se informa como motivo.
        EstudianteAsignadoResponse pendiente = respuesta.contenido().get(1);
        assertEquals(DESHABILITADO, pendiente.estado());
        assertEquals(IdentificacionService.MOTIVO_PENDIENTE, pendiente.motivoInhabilitacion());
        assertFalse(pendiente.ingresado());
    }

    @Test
    void resumeLosTotalesDelExamen() {
        ResumenEstudiantesResponse resumen = new ResumenEstudiantesResponse(3, 2, 1, 1);
        when(examenRepository.existsByIdIdExamen(ID_EXAMEN)).thenReturn(true);
        when(estudianteRepository.resumirAsignadosAlExamen(ID_EXAMEN)).thenReturn(resumen);

        assertEquals(resumen, identificacionService.resumir(ID_EXAMEN));
    }

    @Test
    void rechazaEstadoInvalidoYResponde404SiElExamenNoExiste() {
        assertThrows(IllegalArgumentException.class,
                () -> identificacionService.listarAsignados(ID_EXAMEN, "ACTIVOS", 0, 10));

        when(examenRepository.existsByIdIdExamen(99)).thenReturn(false);
        List<Runnable> consultas = List.of(
                () -> identificacionService.identificar(99, "codigo", "201901234"),
                () -> identificacionService.listarAsignados(99, "habilitados", 0, 10),
                () -> identificacionService.resumir(99));
        for (Runnable consulta : consultas) {
            ControlIngresoException ex = assertThrows(ControlIngresoException.class, consulta::run);
            assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
            assertEquals("No se encontró el examen 99", ex.getMessage());
        }
        verifyNoInteractions(estudianteRepository);
    }
}
