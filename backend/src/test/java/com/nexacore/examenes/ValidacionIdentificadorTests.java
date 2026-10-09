package com.nexacore.examenes;

import com.nexacore.examenes.utils.ValidacionIdentificador;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** BUG-A01: formato del código universitario y del C.I. en el control de ingreso. */
class ValidacionIdentificadorTests {

    @ParameterizedTest
    @ValueSource(strings = {"201904725", "202104010", "199801234"})
    void aceptaCodigosUniversitariosReales(String codigo) {
        assertThatCode(() -> ValidacionIdentificador.validarCodigoUniversitario(codigo)).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "\"{0}\" -> {1}")
    @CsvSource(delimiter = '|', value = {
            "''          | es obligatorio",
            "2019O4725   | no puede contener letras",
            "'2019 04725'| no puede contener espacios",
            "201.904.725 | no puede contener puntos, comas ni caracteres especiales",
            "2019,04725  | no puede contener puntos, comas ni caracteres especiales",
            "20190472#   | no puede contener puntos, comas ni caracteres especiales",
            "20190472    | debe tener exactamente 9 dígitos",
            "2019047251  | debe tener exactamente 9 dígitos",
            "000000000   | no puede ser solo ceros",
            "777777777   | no puede ser un mismo dígito repetido",
            "123456789   | no puede ser una secuencia ascendente o descendente",
            "987654321   | no puede ser una secuencia ascendente o descendente",
            "121212121   | no puede ser un patrón repetido",
            "123123123   | no puede ser un patrón repetido"
    })
    void rechazaCodigosInvalidosConElMotivo(String codigo, String motivo) {
        assertThatThrownBy(() -> ValidacionIdentificador.validarCodigoUniversitario(codigo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El código universitario " + motivo);
    }

    @ParameterizedTest
    @ValueSource(strings = {"78451236", "12345678", "10203040"})
    void aceptaCiDeOchoDigitos(String ci) {
        assertThatCode(() -> ValidacionIdentificador.validarCi(ci)).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "\"{0}\" -> {1}")
    @CsvSource(delimiter = '|', value = {
            "''         | es obligatorio",
            "7845123A   | no puede contener letras",
            "'7845 1236'| no puede contener espacios",
            "7845-1236  | no puede contener puntos, comas ni caracteres especiales",
            "7845123    | debe tener exactamente 8 dígitos",
            "784512361  | debe tener exactamente 8 dígitos",
            "00000000   | no puede ser solo ceros"
    })
    void rechazaCiInvalidosConElMotivo(String ci, String motivo) {
        assertThatThrownBy(() -> ValidacionIdentificador.validarCi(ci))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El C.I. " + motivo);
    }
}
