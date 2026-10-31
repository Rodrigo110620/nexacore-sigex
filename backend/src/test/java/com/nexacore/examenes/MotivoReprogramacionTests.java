package com.nexacore.examenes;

import com.nexacore.examenes.utils.MotivoReprogramacion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** BUG 8 del 2.º test run de QA: motivo de la reprogramación. */
class MotivoReprogramacionTests {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "corto|al menos 10",
            "Se repite  por un corte de luz|un solo espacio",
            "' Se repite por un corte de luz'|un solo espacio",
            "Se repite por un corte de luz!|solo admite letras, números y espacios",
            "1234567890123|no solo números",
            "RRRRRRRRRRRR|misma letra repetida",
            "Se repite en el Aulaaaaaaaaaa|no es válida",
    })
    void rechazaLosMotivosQueReportoQa(String motivo, String mensaje) {
        assertThatThrownBy(() -> MotivoReprogramacion.validar(motivo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(mensaje);
    }

    @Test
    void rechazaMasDeCienCaracteres() {
        assertThatThrownBy(() -> MotivoReprogramacion.validar("Se repite por un corte de luz ".repeat(4).strip()))
                .hasMessageContaining("no puede superar 100");
    }

    @Test
    void guardaEnFormatoOracionConservandoElCodigoDelAula() {
        assertThat(MotivoReprogramacion.validar("SE REPITE POR UN CORTE DE LUZ EN EL AULA 690b"))
                .isEqualTo("Se repite por un corte de luz en el aula 690B");
        assertThat(MotivoReprogramacion.validar("Corte de luz en el pabellón")).isEqualTo("Corte de luz en el pabellón");
    }
}
