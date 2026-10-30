package com.nexacore.examenes;

import com.nexacore.examenes.utils.TextoTraslado;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/** INCI-03: motivo y observación del traslado de ambiente. */
class TextoTrasladoTests {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "COMPUTADORA DAÑADA EN EL AULA|Computadora dañada en el aula",
            "corte de red en el aula 690b|Corte de red en el aula 690B",
            "Proyector sin señal en 682L0IN|Proyector sin señal en 682L0IN",
            "ñandú en la ventana|Ñandú en la ventana",
    })
    void formatoOracionConservaLosCodigosDeAula(String entrada, String esperado) {
        assertThat(TextoTraslado.formatoOracion(entrada)).isEqualTo(esperado);
    }

    @Test
    void motivoAceptaTildesDieresisEnieYNumeros() {
        assertThat(TextoTraslado.motivoValido("Pingüino dañó la máquina del aula 690B")).isTrue();
        assertThat(TextoTraslado.motivoValido("Corte de red, aula 690B")).isFalse();
    }

    @Test
    void observacionAceptaTildesPeroNoNumeros() {
        assertThat(TextoTraslado.observacionValida("Computadora dañada sin pantalla")).isTrue();
        assertThat(TextoTraslado.observacionValida("Vergüenza ajena")).isTrue();
        assertThat(TextoTraslado.observacionValida("Aula 690B")).isFalse();
    }
}
