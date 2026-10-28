package com.nexacore.examenes;

import com.nexacore.examenes.utils.ValidacionTextoFoto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** HU#6: detalle del reporte de foto y motivo del rechazo (BUG-E01 a E10 de QA). */
class ValidacionTextoFotoTests {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Wwwwwwwwwwwwwww|misma letra repetida",                 // BUG-E01
            "11111111111111111111111|solo admite letras y espacios", // BUG-E02
            "?????????????????????????????|solo admite letras y espacios", // BUG-E03
            "ff|al menos 10 caracteres",                             // BUG-E06
    })
    void elDetalleDelReporteRechazaDatosInconsistentes(String detalle, String motivo) {
        assertThatThrownBy(() -> ValidacionTextoFoto.detalleReporte(detalle))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining(motivo);
    }

    @Test
    void elDetalleNoSuperaLos65Caracteres() {
        // BUG-E04: además rompía la tarjeta de la revisión.
        assertThatThrownBy(() -> ValidacionTextoFoto.detalleReporte("la persona no se parece ".repeat(3)))
                .hasMessageContaining("no puede superar 65 caracteres");
    }

    @Test
    void elDetalleSeGuardaEnFormatoOracionYEsOpcional() {
        // BUG-E05
        assertThat(ValidacionTextoFoto.detalleReporte("LA PERSONA NO SE PARECE AL DE LA FOTO"))
                .isEqualTo("La persona no se parece al de la foto");
        assertThat(ValidacionTextoFoto.detalleReporte("  la persona   no se parece  ")).isEqualTo("La persona no se parece");
        assertThat(ValidacionTextoFoto.detalleReporte("   ")).isNull();
        assertThat(ValidacionTextoFoto.detalleReporte(null)).isNull();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "??????????????????????????????|solo admite letras, espacios, coma y punto", // BUG-E07
            "...,,,..|debe tener letras",
            "111111111111111111111111111111111|no puede contener números",               // BUG-E08
            "La foto 2 está borrosa|no puede contener números",
            "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee|misma letra repetida",                    // BUG-E09
    })
    void elMotivoDelRechazoRechazaDatosInconsistentes(String motivo, String error) {
        assertThatThrownBy(() -> ValidacionTextoFoto.motivoRechazo(motivo))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining(error);
    }

    @Test
    void elMotivoDelRechazoSeGuardaEnFormatoOracion() {
        // BUG-E10
        assertThat(ValidacionTextoFoto.motivoRechazo("la foto está borrosa, toma otra con más luz."))
                .isEqualTo("La foto está borrosa, toma otra con más luz.");
        assertThat(ValidacionTextoFoto.motivoRechazo("NO SE VE EL ROSTRO")).isEqualTo("No se ve el rostro");
        assertThatThrownBy(() -> ValidacionTextoFoto.motivoRechazo("  ")).hasMessage("Indica el motivo del rechazo");
    }
}
