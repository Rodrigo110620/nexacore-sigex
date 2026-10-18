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

    @ParameterizedTest
    @ValueSource(strings = {"ab@est.umss.edu", "111111@est.umss.edu", "___@est.umss.edu", "wwwwwww@erst.umss.edu"})
    void rechazaCorreosQueIncumplenQaA01(String email) {
        var request = new RegistrarEstudianteRequest("Nombre", "Apellidos", "12345678", null, email, "202404012", 1, 10, null, null);

        assertTrue(validator.validate(request).stream().anyMatch(error -> error.getPropertyPath().toString().equals("email")));
    }

    @Test
    void aceptaCorreoInstitucionalConParteLocalValida() {
        var request = new RegistrarEstudianteRequest("Nombre", "Apellidos", "12345678", null, "correo@umss.edu", "202404012", 1, 10, null, null);

        assertFalse(validator.validate(request).stream().anyMatch(error -> error.getPropertyPath().toString().equals("email")));
    }
}