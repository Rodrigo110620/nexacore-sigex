package com.nexacore.examenes;

import com.nexacore.examenes.dto.ReglasEstudiante;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** El C.I. no puede ser igual al código SIS ni estar contenido en él (registro, edición e importación). */
class SisDistintoDeCiTests {

    @Test
    void rechazaUnCiContenidoEnElSis() {
        assertThatThrownBy(() -> ReglasEstudiante.validarSisDistintoDeCi("202104010", "20210401"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(ReglasEstudiante.MSG_SIS_IGUAL_CI);
        assertThatThrownBy(() -> ReglasEstudiante.validarSisDistintoDeCi(" 202104010 ", "2104010"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aceptaDatosDistintos() {
        assertThatCode(() -> ReglasEstudiante.validarSisDistintoDeCi("202104010", "7489210")).doesNotThrowAnyException();
        assertThatCode(() -> ReglasEstudiante.validarSisDistintoDeCi(null, "7489210")).doesNotThrowAnyException();
    }
}
