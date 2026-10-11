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
        var request = new RegistrarEstudianteRequest(
                "Ana", "Pérez Flores", "74839201", email, "202600001", 1, 10);

        assertTrue(validator.validate(request).stream().anyMatch(error -> error.getPropertyPath().toString().equals("email")));
    }

    @Test
    void aceptaCorreoInstitucionalConParteLocalValida() {
        var request = new RegistrarEstudianteRequest(
                "Ana", "Pérez Flores", "74839201", "ana.perez@est.umss.edu", "202600001", 1, 10);

        assertFalse(validator.validate(request).stream().anyMatch(error -> error.getPropertyPath().toString().equals("email")));
    }
}
