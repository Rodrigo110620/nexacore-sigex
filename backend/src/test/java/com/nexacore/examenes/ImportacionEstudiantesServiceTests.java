package com.nexacore.examenes;

import java.util.List;
import com.nexacore.examenes.dto.ReglasEstudiante;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import com.nexacore.examenes.services.RegistroLoteEstudiantesService;
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
    @Mock RegistroLoteEstudiantesService registroLote;
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
        service = new ImportacionEstudiantesService(estudianteService, registroLote, validator);
        // El bloque simulado registra cada estudiante con registrar(): las verificaciones de esta clase
        // siguen viendo qué solicitud llega y con qué error responde la base.
        lenient().when(registroLote.registrar(any())).thenAnswer(invocation -> {
            List<RegistrarEstudianteRequest> bloque = invocation.getArgument(0);
            List<String> errores = new java.util.ArrayList<>();
            for (RegistrarEstudianteRequest r : bloque) {
                try {
                    estudianteService.registrar(r);
                    errores.add(null);
                } catch (EstudianteDuplicadoException | IllegalArgumentException e) {
                    errores.add(e.getMessage());
                }
            }
            return errores;
        });
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
            + "202404012;María;González Flores;7489210;202404012@EST.umss.edu;1;10\n");

        var result = service.importar(file);

        assertEquals(1, result.insertados());
        assertEquals(0, result.ignorados());
        verify(estudianteService).registrar(argThat((RegistrarEstudianteRequest r) ->
            r.codigoSis().equals("202404012") && r.email().equals("202404012@est.umss.edu")
                && r.idFacultad() == 1 && r.idCarrera() == 10));
    }

    @Test
    void importaTelefonoYEstadoDeMatriculaOpcionales() {
        var file = csv("codigoSis,nombre,apellidos,ci,email,idFacultad,idCarrera,telefono,estadoMatricula\n"
            + "202404012,María,González Flores,7489210,202404012@est.umss.edu,1,10,71234567,NO_MATRICULADO\n"
            + "202404013,Luis,Rojas Paz,7489211,202404013@est.umss.edu,1,10,41234567,\n");

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
            + "202404014,Eva,Soto,7489212,202404014@est.umss.edu,uno,10\n");

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
            + "202404012,Ana,Pérez,7489210,202404012@est.umss.edu,1,10\n"
            + "202404012,Ana,Pérez,7489219,202404012@est.umss.edu,1,10\n"
            + "202404015,Leo,Mena,7489213,202404015@est.umss.edu,1,10\n");

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

    @Test
    void unaFilaConCorreoConNombreSeRechazaEnLaColumnaCorreo() {
        var result = service.importar(csv(ENCABEZADO
            + "202404012,Ana,Pérez,7489210,ana.perez@est.umss.edu,1,10\n"
            + "202404013,Leo,Mena,7489213,202404013@est.umss.edu,1,10\n"));

        assertEquals(1, result.insertados());
        org.assertj.core.api.Assertions.assertThat(result.errores()).singleElement().asString()
            .startsWith("Fila 2: El correo del estudiante debe ser su código SIS @est.umss.edu");
    }

    @Test
    void guardaPorBloquesDeQuinientos() {
        StringBuilder contenido = new StringBuilder(ENCABEZADO);
        for (int i = 0; i < 1200; i++) {
            contenido.append(202400000 + i * 7 + 13).append(",Ana,Pérez,").append(3000000 + i * 11 + 17)
                .append(",").append(202400000 + i * 7 + 13).append("@est.umss.edu,1,10\n");
        }

        var result = service.importar(csv(contenido.toString()));

        assertEquals(1200, result.insertados(), String.valueOf(result.errores().stream().limit(3).toList()));
        // 1200 filas = 3 bloques (500, 500 y 200), no 1200 transacciones.
        verify(registroLote, times(3)).registrar(any());
    }

    @Test
    void siLaBaseRechazaElBloqueLoReintentaFilaPorFila() {
        doThrow(new org.springframework.dao.DataIntegrityViolationException("duplicado")).when(registroLote).registrar(any());
        var file = csv(ENCABEZADO
            + "202404012,Ana,Pérez,7489210,202404012@est.umss.edu,1,10\n"
            + "202404015,Leo,Mena,7489213,202404015@est.umss.edu,1,10\n");

        var result = service.importar(file);

        assertEquals(2, result.insertados());
        verify(estudianteService, times(2)).registrar(any());
    }

    @Test
    void aceptaHastaDiezMilFilas() {
        StringBuilder contenido = new StringBuilder(ENCABEZADO);
        for (int i = 0; i < 10_001; i++) contenido.append("x,Ana,Pérez,1,a@umss.edu,1,10\n");

        var error = assertThrows(IllegalArgumentException.class, () -> service.importar(csv(contenido.toString())));

        assertTrue(error.getMessage().contains("10000"), error.getMessage());
    }

    // IMP-13: el mismo archivo en Excel (.xlsx). Celdas numéricas (SIS, CI, ids) como en Excel, tildes y ñ,
    // filas vacías al final y los mismos mensajes por fila que con el CSV.
    private static MockMultipartFile xlsx(Object[]... filas) throws java.io.IOException {
        try (var libro = new org.apache.poi.xssf.usermodel.XSSFWorkbook(); var salida = new java.io.ByteArrayOutputStream()) {
            var hoja = libro.createSheet("Estudiantes");
            for (int r = 0; r < filas.length; r++) {
                var fila = hoja.createRow(r);
                for (int c = 0; c < filas[r].length; c++) {
                    Object v = filas[r][c];
                    if (v instanceof Number n) fila.createCell(c).setCellValue(n.doubleValue());
                    else if (v != null) fila.createCell(c).setCellValue(String.valueOf(v));
                }
            }
            hoja.createRow(filas.length + 3); // fila vacía con formato, como deja Excel
            libro.write(salida);
            return new MockMultipartFile("file", "estudiantes.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", salida.toByteArray());
        }
    }

    private static final Object[] ENCABEZADO_XLSX = {"codigoSis", "nombre", "apellidos", "ci", "email", "idFacultad", "idCarrera"};

    @Test
    void importaUnExcelConCeldasNumericasTildesYEnie() throws Exception {
        var result = service.importar(xlsx(ENCABEZADO_XLSX,
            new Object[] {202404013, "Íñigo", "Gutiérrez Peña", 7489211, "202404013@est.umss.edu", 1, 10}));

        assertEquals(1, result.insertados(), String.valueOf(result.errores()));
        verify(estudianteService).registrar(argThat((RegistrarEstudianteRequest r) ->
            r.codigoSis().equals("202404013") && r.ci().equals("7489211") && r.nombre().equals("Íñigo")
                && r.apellidos().equals("Gutiérrez Peña") && Integer.valueOf(10).equals(r.idCarrera())));
    }

    @Test
    void unExcelConErroresLosInformaPorFilaComoElCsv() throws Exception {
        var result = service.importar(xlsx(ENCABEZADO_XLSX,
            new Object[] {20240401, "Ana", "Rojas Vargas", 7489212, "202404014@est.umss.edu", 1, 10},
            new Object[] {202404015, "Ana", "Rojas Vargas", 123456, "202404015@est.umss.edu", 1, 10}));

        assertEquals(0, result.insertados());
        assertEquals(List.of("Fila 2: " + ReglasEstudiante.MSG_CODIGO_SIS + ".", "Fila 3: " + ReglasEstudiante.MSG_CI + "."),
            result.errores());
    }

    @Test
    void unExcelSinLasColumnasODanadoSeRechaza() throws Exception {
        var sinColumnas = xlsx(new Object[] {"codigo", "nombre"}, new Object[] {"1", "Ana"});
        assertThrows(IllegalArgumentException.class, () -> service.importar(sinColumnas));
        var danado = new MockMultipartFile("file", "estudiantes.xlsx", "application/octet-stream", "no es excel".getBytes(StandardCharsets.UTF_8));
        var error = assertThrows(IllegalArgumentException.class, () -> service.importar(danado));
        assertTrue(error.getMessage().contains("Excel"), error.getMessage());
        var otro = new MockMultipartFile("file", "estudiantes.xls", "application/vnd.ms-excel", new byte[] {1, 2});
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.importar(otro)).getMessage().contains("(.xlsx)"));
    }

    // Sección 22, paso «Revisar»: sin guardar nada, cada error con su fila (como en Excel) y su columna.
    @Test
    void laRevisionNoGuardaYDaFilaColumnaYMensaje() throws Exception {
        var revision = service.revisar(xlsx(ENCABEZADO_XLSX,
            new Object[] {202404013, "Ana", "Rojas Vargas", 7489211, "202404013@est.umss.edu", 1, 10},
            new Object[] {202404015, "Ana", "Rojas Vargas", 123456, "202404015@est.umss.edu", 1, 10},
            new Object[] {202404013, "Luis", "Paz Rivas", 7489299, "202404013@est.umss.edu", 1, 10}));

        assertEquals("Excel", revision.tipo());
        assertEquals(3, revision.filas());
        assertEquals(1, revision.listas());
        assertEquals(2, revision.conErrores());
        assertEquals(List.of(3, 4), revision.errores().stream().map(e -> e.fila()).toList());
        assertEquals("CI", revision.errores().get(0).columna());
        assertEquals("Código SIS", revision.errores().get(1).columna());
        verify(estudianteService, org.mockito.Mockito.never()).registrar(any());
        verify(registroLote, org.mockito.Mockito.never()).registrar(any());
    }

    // Sección 22, paso «Importando»: guarda en segundo plano y el avance llega al total con el resultado.
    @Test
    void laImportacionConAvanceTerminaConElResultado() throws Exception {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("admin@umss.edu", null, List.of()));
        try {
            var inicio = service.iniciar(xlsx(ENCABEZADO_XLSX,
                new Object[] {202404013, "Ana", "Rojas Vargas", 7489211, "202404013@est.umss.edu", 1, 10},
                new Object[] {20240401, "Luis", "Paz Rivas", 7489212, "202404014@est.umss.edu", 1, 10}));
            assertEquals(2, inicio.total());
            var progreso = inicio;
            for (int i = 0; i < 100 && !"LISTA".equals(progreso.estado()); i++) {
                Thread.sleep(20);
                progreso = service.progreso(inicio.id());
            }
            assertEquals("LISTA", progreso.estado());
            assertEquals(2, progreso.procesadas());
            assertEquals(1, progreso.resultado().insertados());
            assertEquals(1, progreso.resultado().ignorados());
            assertTrue(progreso.segundos() >= 1);
            // Otro usuario no ve el avance ajeno.
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("otro@umss.edu", null, List.of()));
            org.junit.jupiter.api.Assertions.assertNull(service.progreso(inicio.id()));
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
}
