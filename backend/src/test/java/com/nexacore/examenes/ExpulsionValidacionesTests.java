package com.nexacore.examenes;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.AsistenciaExamenId;
import com.nexacore.examenes.utils.ExpulsionValidaciones;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExpulsionValidacionesTests {
    static final String CIEN = "Se anuló la expulsión por un error del personal de control al verificar el CI del estudiante en aula";
    private static final ExpulsarEstudianteRequest REQUEST = new ExpulsarEstudianteRequest(10, 20, "Uso de celular");

    @Test
    void dtoExigeIdentificadoresPositivosYMotivoConLimite() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(REQUEST).isEmpty());
            for (Integer id : new Integer[] {null, 0, -1}) {
                assertFalse(validator.validate(new ExpulsarEstudianteRequest(id, 20, REQUEST.motivo())).isEmpty());
                assertFalse(validator.validate(new ExpulsarEstudianteRequest(10, id, REQUEST.motivo())).isEmpty());
            }
            for (String motivo : new String[] {null, "", " \n\t ", "Copia ora", "ab".repeat(33)}) {
                assertFalse(validator.validate(new ExpulsarEstudianteRequest(10, 20, motivo)).isEmpty());
            }
            assertTrue(validator.validate(new ExpulsarEstudianteRequest(10, 20, "ab".repeat(32) + "c")).isEmpty());
        }
    }

    @Test
    void responsableProvieneDelPrincipalAdminAutenticado() {
        assertEquals("admin@sigex.test", ExpulsionValidaciones.responsableAutenticado(autenticado("ADMIN")));
    }

    /** El docente también expulsa; que el examen sea suyo lo verifica la ruta (ExamenAccesoService.puedeExpulsar). */
    @Test
    void elDocenteTambienPuedeSerResponsable() {
        assertEquals("admin@sigex.test", ExpulsionValidaciones.responsableAutenticado(autenticado("DOCENTE")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONTROL", "ESTUDIANTE", "SUPERADMIN"})
    void exigeAdminODocenteAunqueElRolPuedaControlar(String rol) {
        var error = assertThrows(ControlIngresoException.class,
                () -> ExpulsionValidaciones.responsableAutenticado(autenticado(rol)));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void rechazaAusenciaDeSesionYSesionAnonimaAunqueDeclareAdmin() {
        var anonimo = new AnonymousAuthenticationToken("test", "anonimo", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        var sinAutenticar = UsernamePasswordAuthenticationToken.unauthenticated("admin@sigex.test", "ignorado");
        var sinNombre = UsernamePasswordAuthenticationToken.authenticated(" ", "ignorado", autenticado("ADMIN").getAuthorities());
        for (Authentication auth : new Authentication[] {null, anonimo, sinAutenticar, sinNombre}) {
            var error = assertThrows(ControlIngresoException.class, () -> ExpulsionValidaciones.responsableAutenticado(auth));
            assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\n\t", "????", "aaaa", "Texto <script>"})
    void motivoEsObligatorioYReutilizaLasReglasDeTexto(String motivo) {
        assertThrows(IllegalArgumentException.class, () -> ExpulsionValidaciones.motivo(motivo));
    }

    @ParameterizedTest
    @CsvSource({"uso de celular,Uso de celular", "USO DE CELULAR,Uso de celular",
            "  áRBOL y ÑANDÚ  ,Árbol y ñandú", "¿uSO de CELULAR?,¿Uso de celular?", "Uso   de celular,Uso de celular",
            "Uso de WhatsApp durante el examen,Uso de whatsapp durante el examen", "Consulta de archivo PDF,Consulta de archivo PDF",
            "Uso de ChatGPT durante el examen,Uso de chatgpt durante el examen", "Uso de código en C durante el examen,Uso de código en C durante el examen",
            "USO DE CI EN AULA 690B,Uso de CI en aula 690B", "Uso de SIS durante el examen,Uso de SIS durante el examen",
            "uSO de cI y sIs en aula 690B,Uso de CI y SIS en aula 690B", "CI ajeno durante el examen,CI ajeno durante el examen",
            "Uso de CI en el aula 690b,Uso de CI en el aula 690b", "ÁRBOL Y ÑANDÚ EN 690B,Árbol y ñandú en 690B",
            "690b uso de CI durante el examen,690b uso de CI durante el examen",
            "USO DE LA RED EN EL AULA,Uso de la red en el aula",
            "123 uso de CELULAR,123 Uso de celular"})
    void normalizaOracionYEspaciosSinAlterarSignos(String entrada, String esperado) {
        assertEquals(esperado, ExpulsionValidaciones.motivo(entrada));
        assertEquals(esperado, ExpulsionValidaciones.motivo(esperado));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Copia ora", "Drrtgrdsgdgdfggfdffd", "Uso de celularrrrr",
            "Uso\nde celular", "1234567890", "Uso de qwerty", "Uso de 682L0IN",
            "Uso de QWERTY durante el examen", "Uso de CI <script>"})
    void rechazaLongitudContenidoYSeparacionesInvalidas(String motivo) {
        assertThrows(IllegalArgumentException.class, () -> ExpulsionValidaciones.motivo(motivo));
    }

    @Test
    void admiteLosLimitesDiezYSesentaYCincoSinBloquearSiglas() {
        assertEquals("Copia oral", ExpulsionValidaciones.motivo("Copia oral"));
        String limite = "Uso de celular durante el examen para copiar respuestas de física";
        assertEquals(65, limite.length());
        assertEquals(limite.toLowerCase().replaceFirst("u", "U"), ExpulsionValidaciones.motivo(limite));
        assertThrows(IllegalArgumentException.class, () -> ExpulsionValidaciones.motivo(limite + "s"));
        assertEquals("Uso de QR durante el examen", ExpulsionValidaciones.motivo("USO DE QR DURANTE EL EXAMEN"));
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var normalizado = new ExpulsarEstudianteRequest(10, 20, limite.replace(" ", "   "));
            assertEquals(limite, normalizado.motivo());
            assertTrue(factory.getValidator().validate(normalizado).isEmpty());
            assertFalse(factory.getValidator().validate(new ExpulsarEstudianteRequest(10, 20, "Copia    ora")).isEmpty());
        }
    }

    @Test
    void exigeLaAsociacionExactaDeEstudianteYExamen() {
        var sinId = new AsistenciaExamen();
        for (AsistenciaExamen asistencia : new AsistenciaExamen[] {null, sinId, asistencia(11, 20), asistencia(10, 21)}) {
            var error = assertThrows(ControlIngresoException.class, () -> ExpulsionValidaciones.asistencia(REQUEST, asistencia));
            assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        }
    }

    private static Authentication autenticado(String rol) {
        return UsernamePasswordAuthenticationToken.authenticated("admin@sigex.test", "ignorado",
                List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Error del", CIEN + "."})
    void anulacionRechazaNueveYCientoUnCaracteresSinPasarPorElDto(String motivo) {
        assertThrows(IllegalArgumentException.class, () -> ExpulsionValidaciones.motivoAnulacion(motivo));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Error leve", CIEN})
    void anulacionAceptaDiezYCienCaracteres(String motivo) {
        assertTrue(motivo.length() == 10 || motivo.length() == 100);
        assertEquals(motivo, ExpulsionValidaciones.motivoAnulacion(motivo));
    }

    private static AsistenciaExamen asistencia(int estudiante, int examen) {
        var id = new AsistenciaExamenId();
        id.setIdEstudiante(estudiante);
        id.setIdExamen(examen);
        var asistencia = new AsistenciaExamen();
        asistencia.setId(id);
        return asistencia;
    }
}
