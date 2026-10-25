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
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExpulsionValidacionesTests {
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
            for (String motivo : new String[] {null, "", " \n\t ", "ab".repeat(250) + "c"}) {
                assertFalse(validator.validate(new ExpulsarEstudianteRequest(10, 20, motivo)).isEmpty());
            }
            assertTrue(validator.validate(new ExpulsarEstudianteRequest(10, 20, "ab".repeat(250))).isEmpty());
        }
    }

    @Test
    void responsableProvieneDelPrincipalAdminAutenticado() {
        assertEquals("admin@sigex.test", ExpulsionValidaciones.responsableAutenticado(autenticado("ADMIN")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONTROL", "DOCENTE", "ESTUDIANTE", "SUPERADMIN"})
    void exigeAdminExactoAunqueElRolPuedaControlar(String rol) {
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

    private static AsistenciaExamen asistencia(int estudiante, int examen) {
        var id = new AsistenciaExamenId();
        id.setIdEstudiante(estudiante);
        id.setIdExamen(examen);
        var asistencia = new AsistenciaExamen();
        asistencia.setId(id);
        return asistencia;
    }
}
