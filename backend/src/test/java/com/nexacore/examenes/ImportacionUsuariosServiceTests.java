package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.exceptions.EmailDuplicadoException;
import com.nexacore.examenes.exceptions.RolInvalidoException;
import com.nexacore.examenes.services.ImportacionUsuariosService;
import com.nexacore.examenes.services.UsuarioService;
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
class ImportacionUsuariosServiceTests {

    private static jakarta.validation.ValidatorFactory factory;
    private static Validator validator;

    @Mock UsuarioService usuarioService;
    private ImportacionUsuariosService service;

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
        service = new ImportacionUsuariosService(usuarioService, validator);
    }

    private static MockMultipartFile csv(String contenido) {
        return new MockMultipartFile("file", "usuarios.csv", "text/csv",
            contenido.getBytes(StandardCharsets.UTF_8));
    }

    private static final String ENCABEZADO = "nombre,apellidos,ci,email,rol\n";

    @Test
    void importaCsvDeExcelConBomYPuntoYComa() {
        var result = service.importar(csv("﻿nombre;apellidos;ci;email;rol;estado\n"
            + "María;González Flores;7489210;Maria.Gonzalez@est.umss.edu;docente;inactivo\n"));

        assertEquals(1, result.insertados());
        assertEquals(0, result.ignorados());
        verify(usuarioService).registrar(argThat((RegisterUserRequest r) ->
            r.email().equals("maria.gonzalez@est.umss.edu") && r.rol().equals("DOCENTE")
                && Boolean.FALSE.equals(r.activo()) && Boolean.TRUE.equals(r.notificarEmail())));
    }

    @Test
    void estadoVacioEsActivoYLaColumnaIdDelExportSeIgnora() {
        var result = service.importar(csv("id;nombre;apellidos;ci;email;rol;estado\n"
            + "99;Ana;Rojas Vidal;6512340;ana.rojas@est.umss.edu;CONTROL;\n"));

        assertEquals(1, result.insertados());
        verify(usuarioService).registrar(argThat((RegisterUserRequest r) -> Boolean.TRUE.equals(r.activo())));
    }

    @Test
    void reportaFilasInvalidasSinGuardarlasYSigueConLasDemas() {
        var result = service.importar(csv(ENCABEZADO
            + "Ana;Rojas;123;ana@gmail.com;ADMIN\n".replace(';', ',')
            + "Luis,Pérez Soto,7654321,luis.perez@est.umss.edu,CONTROL\n"));

        assertEquals(1, result.insertados());
        assertEquals(1, result.ignorados());
        assertTrue(result.errores().get(0).startsWith("Fila 2: "));
        assertTrue(result.errores().get(0).contains("CI/DNI"));
        assertTrue(result.errores().get(0).contains("correos institucionales"));
        verify(usuarioService, times(1)).registrar(any());
    }

    @Test
    void detectaCorreoYCiRepetidosEnElArchivo() {
        var result = service.importar(csv(ENCABEZADO
            + "Ana,Rojas Vidal,6512340,ana.rojas@est.umss.edu,ADMIN\n"
            + "Ana,Rojas Paz,7777777,ANA.ROJAS@est.umss.edu,ADMIN\n"
            + "Leo,Mena Cruz,6512340,leo.mena@est.umss.edu,ADMIN\n"));

        assertEquals(1, result.insertados());
        assertEquals(2, result.ignorados());
        assertTrue(result.errores().get(0).contains("correo ana.rojas@est.umss.edu está repetido"));
        assertTrue(result.errores().get(1).contains("CI 6512340 está repetido"));
    }

    @Test
    void informaEstadoInvalidoEmailYaRegistradoYRolInexistente() {
        when(usuarioService.registrar(argThat(r -> r != null && r.email().startsWith("dup"))))
            .thenThrow(new EmailDuplicadoException("dup.user@est.umss.edu"));
        when(usuarioService.registrar(argThat(r -> r != null && r.rol().equals("JEFE"))))
            .thenThrow(new RolInvalidoException("JEFE"));

        var result = service.importar(csv("nombre,apellidos,ci,email,rol,estado\n"
            + "Ana,Rojas Vidal,6512340,ana.rojas@est.umss.edu,ADMIN,suspendido\n"
            + "Dina,Ugarte Paz,7000001,dup.user@est.umss.edu,ADMIN,\n"
            + "Raul,Vega Rios,7000002,raul.vega@est.umss.edu,jefe,\n"));

        assertEquals(0, result.insertados());
        assertEquals(3, result.ignorados());
        assertTrue(result.errores().get(0).contains("activo o inactivo"));
        assertTrue(result.errores().get(1).contains("ya esta registrado"));
        assertTrue(result.errores().get(2).contains("no existe"));
    }

    @Test
    void rechazaArchivoSinColumnasRequeridasVacioONoCsv() {
        var error = assertThrows(IllegalArgumentException.class,
            () -> service.importar(csv("nombre,apellidos,email\nAna,Rojas,ana@est.umss.edu\n")));
        assertTrue(error.getMessage().contains("ci, rol"));

        assertThrows(IllegalArgumentException.class, () -> service.importar(csv("")));
        assertThrows(IllegalArgumentException.class, () -> service.importar(csv(ENCABEZADO)));
        var xlsx = new MockMultipartFile("file", "usuarios.xlsx", "application/octet-stream", new byte[]{1});
        assertThrows(IllegalArgumentException.class, () -> service.importar(xlsx));
        verifyNoInteractions(usuarioService);
    }
}
