package com.nexacore.examenes;

import com.nexacore.examenes.utils.ValidacionPalabras;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class ValidacionPalabrasTests {

    @ParameterizedTest
    @ValueSource(strings = {"Deuda", "biblioteca", "Psicología", "obstrucción", "extranjero",
            "Inscripción", "y", "muy", "guía", "Ingeniería", "Ñandú", "construcción"})
    void aceptaPalabrasReales(String palabra) {
        assertThat(ValidacionPalabras.pareceUnaPalabra(palabra)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"fsfasfsaf", "qwerty", "asdfgh", "jajaja", "xkcd", "sdfsdf", "aaaaaa", "mnbv"})
    void rechazaGarabatos(String palabra) {
        assertThat(ValidacionPalabras.pareceUnaPalabra(palabra)).isFalse();
    }

    @Test
    void enNormasAceptaNumerosYOrdinalesPeroSenalaElGarabato() {
        assertThat(ValidacionPalabras.primerGarabato("Tolerancia de 30 minutos")).isNull();
        assertThat(ValidacionPalabras.primerGarabato("Traer CI del 2do semestre.")).isNull();
        assertThat(ValidacionPalabras.primerGarabato("Traer fsfasfsaf al examen")).isEqualTo("fsfasfsaf");
        assertThat(ValidacionPalabras.primerGarabato("No usar celular abc123")).isEqualTo("abc123");
    }

    @ParameterizedTest
    @ValueSource(strings = {"692F", "682L0IN", "690MAT", "606", "L813", "A808", "INFLAB", "LABMAT",
            "AUDELEK", "MEMIDIR", "CADCAM", "CAE"})
    void aceptaCodigosDeAmbienteReales(String nombre) {
        assertThat(ValidacionPalabras.esCodigoDeAmbiente(nombre)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ASDFGH", "QWERTY", "FSFASF", "XKCD", "1234567", "LAB3", "12AB"})
    void rechazaAmbientesSinFormaDeCodigo(String nombre) {
        assertThat(ValidacionPalabras.esCodigoDeAmbiente(nombre)).isFalse();
    }
}
