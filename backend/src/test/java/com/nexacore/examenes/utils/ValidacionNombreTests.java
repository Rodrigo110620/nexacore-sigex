package com.nexacore.examenes.utils;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/** Nombres que parecen reales al registrar o editar usuarios y estudiantes. */
class ValidacionNombreTests {

    @ParameterizedTest
    @ValueSource(strings = {"Juan Carlos", "María José", "Kjarkas", "Q'uispe", "Schmidt", "Llanque Mamani", "Ly", "Ñuflo", "Pérez-Rojas"})
    void aceptaNombresReales(String nombre) {
        assertThat(ValidacionNombre.problema(nombre)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Aaaa", "Bbbb Cccc", "Xkcd", "Qwerty", "Asdfgh", "Jajaja", "Mnbvcxz"})
    void rechazaGarabatos(String nombre) {
        assertThat(ValidacionNombre.problema(nombre)).isNotNull();
    }

    @Test
    void guardaConMayusculaInicialEnCadaPalabra() {
        assertThat(ValidacionNombre.normalizar("  jUAN   carlos  ")).isEqualTo("Juan Carlos");
        assertThat(ValidacionNombre.normalizar("pérez-ROJAS")).isEqualTo("Pérez-Rojas");
        assertThat(ValidacionNombre.normalizar("q'uispe")).isEqualTo("Q'uispe");
    }
}
