package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.models.EstadoMatricula;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** IMP-06: teléfono opcional (8 dígitos, empieza con 5, 6 o 7) y estado de matrícula. */
class TelefonoMatriculaTests {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private RegistrarEstudianteRequest request(String telefono, String estadoMatricula) {
        return new RegistrarEstudianteRequest("María", "González", "7489210", "maria.gonzalez@est.umss.edu",
                "202104010", 1, 10, null, telefono, estadoMatricula);
    }

    @ParameterizedTest
    @ValueSource(strings = {"71234567", "60000001", "59999999", ""})
    void aceptaTelefonosValidosOVacio(String telefono) {
        assertThat(validator.validate(request(telefono, null))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"41234567", "7123456", "712345678", "7123456a", "7123 4567"})
    void rechazaTelefonosInvalidos(String telefono) {
        assertThat(validator.validate(request(telefono, null)))
                .anyMatch(v -> v.getMessage().contains("8 dígitos"));
    }

    @Test
    void aceptaElEstadoDeMatriculaSinDistinguirMayusculas() {
        assertThat(validator.validate(request(null, "no_matriculado"))).isEmpty();
        assertThat(validator.validate(request(null, "OTRO"))).isNotEmpty();
        assertThat(EstadoMatricula.normalizar("no_matriculado", EstadoMatricula.MATRICULADO))
                .isEqualTo(EstadoMatricula.NO_MATRICULADO);
        assertThat(EstadoMatricula.normalizar(null, EstadoMatricula.MATRICULADO))
                .isEqualTo(EstadoMatricula.MATRICULADO);
    }

    @Test
    void alEditarNullConservaElTelefonoYVacioLoQuita() {
        assertThat(EstadoMatricula.normalizarTelefono(null, "71234567")).isEqualTo("71234567");
        assertThat(EstadoMatricula.normalizarTelefono("", "71234567")).isNull();
        assertThat(EstadoMatricula.normalizarTelefono(" 6123 4567 ", null)).isEqualTo("61234567");
        assertThatThrownBy(() -> EstadoMatricula.normalizarTelefono("41234567", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
