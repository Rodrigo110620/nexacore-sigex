package com.nexacore.examenes.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** BUG-C01: la especialidad del docente solo admite letras con un espacio entre palabras, de 10 a 100 caracteres. */
class DatosDocenteRequestTests {

    private final Validator validador = Validation.buildDefaultValidatorFactory().getValidator();

    private boolean valida(String especialidad) {
        return validador.validate(new DatosDocenteRequest("M.Sc.", especialidad, "INTERINO")).isEmpty();
    }

    @Test
    void aceptaLetrasConUnEspacioYVaciaPorqueEsOpcional() {
        assertThat(valida("Bases de datos")).isTrue();
        assertThat(valida("Ingeniería de software")).isTrue();
        assertThat(valida("Ñandú técnicas avanzadas")).isTrue();
        assertThat(valida(null)).isTrue();
        assertThat(valida("   ")).isTrue();
    }

    @Test
    void rechazaNumerosSimbolosEspaciosDoblesYMenosDeDiezCaracteres() {
        assertThat(valida("Redes 2")).isFalse();
        assertThat(valida("Bases de  datos")).isFalse();
        assertThat(valida("Bases-de-datos")).isFalse();
        assertThat(valida("Redes")).isFalse();
        assertThat(valida("x".repeat(101))).isFalse();
    }
}
