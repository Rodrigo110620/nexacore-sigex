package com.nexacore.examenes;

import com.nexacore.examenes.utils.ZonaHoraria;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ZonaHorariaTests {

    @Test
    void porDefectoUsaLaHoraDeBolivia() {
        assertThat(ZonaHoraria.resolver(null)).isEqualTo(ZoneId.of("America/La_Paz"));
        assertThat(ZonaHoraria.resolver("  ")).isEqualTo(ZoneId.of("America/La_Paz"));
    }

    @Test
    void respetaLaZonaConfiguradaYRechazaUnaInvalida() {
        assertThat(ZonaHoraria.resolver("America/Lima")).isEqualTo(ZoneId.of("America/Lima"));
        assertThatThrownBy(() -> ZonaHoraria.resolver("Bolivia/Cochabamba"))
                .hasMessageContaining("APP_TIMEZONE");
    }
}
