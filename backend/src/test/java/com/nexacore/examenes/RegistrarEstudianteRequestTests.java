package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegistrarEstudianteRequestTests {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    /** El correo ya no se pide (sale del código SIS): lo que llegue no se valida. */
    @ParameterizedTest
    @ValueSource(strings = {"ab@est.umss.edu", "111111@est.umss.edu", "___@est.umss.edu", "wwwwwww@erst.umss.edu"})
    void elCorreoQueLlegueNoSeValidaPorqueSeGenera(String email) {
        var request = new RegistrarEstudianteRequest("Nombre", "Apellidos", "12345678", null, email, "202404012", 1, 10, null, null);

        assertTrue(validator.validate(request).isEmpty());
    }

    /** V58: el C.I. es opcional (el estudiante lo escribe al activar); si viene, 7 u 8 dígitos. */
    @Test
    void elCiEsOpcionalPeroSiVieneDebeSerValido() {
        assertTrue(validator.validate(new RegistrarEstudianteRequest("Nombre", "Apellidos", null, null, null, "202404012", 1, 10, null, null)).isEmpty());
        assertTrue(validator.validate(new RegistrarEstudianteRequest("Nombre", "Apellidos", "", null, null, "202404012", 1, 10, null, null)).isEmpty());
        assertFalse(validator.validate(new RegistrarEstudianteRequest("Nombre", "Apellidos", "12ab", null, null, "202404012", 1, 10, null, null)).isEmpty());
    }
}