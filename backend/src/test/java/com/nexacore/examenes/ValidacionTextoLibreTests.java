package com.nexacore.examenes;

import com.nexacore.examenes.utils.ValidacionTextoLibre;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** BUG-D02: "Detalle adicional" de la denegación (opcional, 1 a 500 caracteres). */
class ValidacionTextoLibreTests {

    private static String validar(String texto) {
        return ValidacionTextoLibre.validarOpcional(texto, "El detalle", 1, 500);
    }

    @Test
    void vacioEsOpcionalYElTextoValidoSeDevuelveSinEspaciosEnLosExtremos() {
        assertThat(validar(null)).isNull();
        assertThat(validar("")).isNull();
        assertThat(validar("  Llegó tarde: 10 min (sin credencial); ¿avisó? ¡No! - Ñandú  "))
                .isEqualTo("Llegó tarde: 10 min (sin credencial); ¿avisó? ¡No! - Ñandú");
        assertThat(validar("Güemes vio un pingüino. ÜBER")).isEqualTo("Güemes vio un pingüino. ÜBER");
        assertThat(validar("x")).isEqualTo("x");
        assertThat(validar("a".repeat(499) + "b")).hasSize(500);
    }

    @ParameterizedTest(name = "\"{0}\" -> {1}")
    @CsvSource(delimiter = '|', value = {
            "'   '              | no puede tener solo espacios",
            "Llegó ’tarde’      | tiene caracteres no permitidos: ’",
            "Dijo \"no\" & salió | tiene caracteres no permitidos: \" &",
            "???????            | debe tener letras o números, no solo signos",
            "... --- !!!        | debe tener letras o números, no solo signos",
            "tttttttttt         | no puede ser un mismo carácter repetido",
            "a a a a            | no puede ser un mismo carácter repetido",
            "üÜ üÜ              | no puede ser un mismo carácter repetido"
    })
    void rechazaConElMotivo(String texto, String motivo) {
        assertThatThrownBy(() -> validar(texto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El detalle " + motivo);
    }

    @Test
    void rechazaMasDe500Caracteres() {
        assertThatThrownBy(() -> validar("a".repeat(500) + "b"))
                .hasMessage("El detalle no puede superar 500 caracteres");
    }

    /** Un salto de línea se permite y, para las reglas, cuenta como un espacio. */
    @Test
    void aceptaSaltosDeLineaComoEspacios() {
        assertThat(validar("\nPrimera línea\r\nsegunda.\n")).isEqualTo("Primera línea\r\nsegunda.");
        assertThatThrownBy(() -> validar(" \n \n ")).hasMessage("El detalle no puede tener solo espacios");
        assertThatThrownBy(() -> validar("a\na\n a")).hasMessage("El detalle no puede ser un mismo carácter repetido");
        assertThatThrownBy(() -> validar("Llegó\ttarde")).hasMessage("El detalle tiene caracteres no permitidos: tabulación");
    }
}
