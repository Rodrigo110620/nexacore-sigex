package com.nexacore.examenes;

import java.util.List;
import com.nexacore.examenes.dto.ReglasEstudiante;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportacionEstudiantesServiceTests {
    private static jakarta.validation.ValidatorFactory factory;
    private static Validator validator;

    @Mock EstudianteService estudianteService;
    private ImportacionEstudiantesService service;

    @BeforeAll
    static void initValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @BeforeEach
    void setUp() {
        service = new ImportacionEstudiantesService(estudianteService, validator);
    }

    private static MockMultipartFile csv(String contenido) {
        return new MockMultipartFile("file", "estudiantes.csv", "text/csv",
            contenido.getBytes(StandardCharsets.UTF_8));
    }

    private static final String ENCABEZADO = "codigoSis,nombre,apellidos,ci,email,idFacultad,idCarrera\n";

    @Test
    void leeElCsvQueExcelGuardaEnWindowsConTildesYEnie() {
        // "CSV (delimitado por comas)" de Excel en Windows: Windows-1252, no UTF-8.
        var file = new MockMultipartFile("file", "estudiantes.csv", "text/csv",
            (ENCABEZADO + "202404013,Íñigo,Gutiérrez Peña,7489211,202404013@est.umss.edu,1,10\n")
                .getBytes(java.nio.charset.Charset.forName("windows-1252")));

        var result = service.importar(file);

        assertEquals(1, result.insertados(), String.valueOf(result.errores()));
        verify(estudianteService).registrar(argThat((RegistrarEstudianteRequest r) ->
            r.nombre().equals("Íñigo") && r.apellidos().equals("Gutiérrez Peña")));
    }

    @Test
    void cadaErrorDeDigitosSeInformaUnaSolaVez() {
        var file = csv(ENCABEZADO
            + "20240401,Ana,Rojas Vargas,7489212,202404014@est.umss.edu,1,10\n"
            + "202404015,Ana,Rojas Vargas,123456,202404015@est.umss.edu,1,10\n");

        var result = service.importar(file);

        assertEquals(List.of("Fila 2: " + ReglasEstudiante.MSG_CODIGO_SIS + ".", "Fila 3: " + ReglasEstudiante.MSG_CI + "."),
            result.errores());
    }

    @Test
    void importaTelefonoYEstadoDeMatriculaDeLaPlanillaExportada() {
        var file = csv("\uFEFFcodigoSis;nombre;apellidos;ci;email;idFacultad;idCarrera;telefono;estadoMatricula\n"
            + "202404016;Ana;Rojas Vargas;7489216;202404016@est.umss.edu;1;10;71234567;NO_MATRICULADO\n");

        var result = service.importar(file);

        assertEquals(1, result.insertados(), String.valueOf(result.errores()));
        verify(estudianteService).registrar(argThat((RegistrarEstudianteRequest r) ->
            "71234567".equals(r.telefono()) && "NO_MATRICULADO".equals(r.estadoMatricula())));
    }

    @Test
    void importaCsvDeExcelConBomYPuntoYComa() {
        var file = csv("\uFEFFcodigoSis;nombre;apellidos;ci;email;idFacultad;idCarrera\n"
            + "202404012;María;González Flores;7489210;Maria@umss.edu;1;10\n");

        var result = service.importar(file);

        assertEquals(1, result.insertados());
        assertEquals(0, result.ignorados());
        verify(estudianteService).registrar(argThat((RegistrarEstudianteRequest r) ->
            r.codigoSis().equals("202404012") && r.email().equals("maria@umss.edu")
                && r.idFacultad() == 1 && r.idCarrera() == 10));
    }

    @Test
    void importaTelefonoYEstadoDeMatriculaOpcionales() {
        var file = csv("codigoSis,nombre,apellidos,ci,email,idFacultad,idCarrera,telefono,estadoMatricula\n"
            + "202404012,María,González Flores,7489210,maria@umss.edu,1,10,71234567,NO_MATRICULADO\n"
            + "202404013,Luis,Rojas Paz,7489211,luis@umss.edu,1,10,41234567,\n");

        var result = service.importar(file);

        assertEquals(2, result.insertados());
        assertEquals(0, result.ignorados());
        
        verify(estudianteService, times(2)).registrar(any());
        
        verify(estudianteService).registrar(argThat((RegistrarEstudianteRequest r) ->
            "71234567".equals(r.telefono()) && "NO_MATRICULADO".equals(r.estadoMatricula())));
    }

    @Test
    void reportaFilasInvalidasSinGuardarlas() {
        var file = csv(ENCABEZADO
            + "12345,Ana,Pérez,7489210,ana@umss.edu,1,10\n"
            + "202404013,Luis,Rojas,7489211,,1,10\n"
            + "202404014,Eva,Soto,7489212,eva@umss.edu,uno,10\n");

        var result = service.importar(file);

        assertEquals(0, result.insertados());
        assertEquals(3, result.ignorados());
        assertTrue(result.errores().get(0).startsWith("Fila 2: "));
        assertTrue(result.errores().get(0).contains("9 dígitos"));
        assertTrue(result.errores().get(1).contains("correo electrónico es obligatorio"));
        assertTrue(result.errores().get(2).contains("idFacultad debe ser un número"));
        verify(estudianteService, never()).registrar(any());
    }

    @Test
    void ignoraDuplicadosDelArchivoYDeLaBase() {
        when(estudianteService.registrar(any())).thenAnswer(invocation -> {
            RegistrarEstudianteRequest r = invocation.getArgument(0);
            if (r.codigoSis().equals("202404015")) {
                throw new EstudianteDuplicadoException("Ya existe un estudiante con ese código SIS.");
            }
            return null;
        });
        var file = csv(ENCABEZADO
            + "202404012,Ana,Pérez,7489210,ana@umss.edu,1,10\n"
            + "202404012,Ana,Pérez,7489219,ana2@umss.edu,1,10\n"
            + "202404015,Leo,Mena,7489213,leo@umss.edu,1,10\n");

        var result = service.importar(file);

        assertEquals(1, result.insertados());
        assertEquals(2, result.ignorados());
        assertEquals("Fila 3: el código SIS 202404012 está repetido en el archivo.", result.errores().get(0));
        assertEquals("Fila 4: Ya existe un estudiante con ese código SIS.", result.errores().get(1));
    }

    @Test
    void rechazaArchivoSinColumnasObligatorias() {
        var file = csv("codigoSis,nombre\n202404012,Ana\n");

        var error = assertThrows(IllegalArgumentException.class, () -> service.importar(file));

        assertTrue(error.getMessage().contains("apellidos"));
        verifyNoInteractions(estudianteService);
    }

    @Test
    void rechazaArchivoVacioOQueNoEsCsv() {
        assertThrows(IllegalArgumentException.class, () -> service.importar(csv("")));
        var xlsx = new MockMultipartFile("file", "estudiantes.xlsx", "application/octet-stream", new byte[]{1});
        assertThrows(IllegalArgumentException.class, () -> service.importar(xlsx));
    }
}
