package com.nexacore.examenes;

import com.nexacore.examenes.dto.OcupacionAulaResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** DASH-03 (alerta de aforo): estado de un aula según su ocupación. */
class OcupacionAulaTests {

    @Test
    void llenaAlLlegarALaCapacidadYCasiLlenaDesdeElNoventaPorCiento() {
        assertEquals(OcupacionAulaResponse.LIBRE, OcupacionAulaResponse.estadoDe(40, 35));
        assertEquals(OcupacionAulaResponse.CASI_LLENA, OcupacionAulaResponse.estadoDe(40, 36));
        assertEquals(OcupacionAulaResponse.LLENA, OcupacionAulaResponse.estadoDe(40, 40));
        assertEquals(OcupacionAulaResponse.LLENA, OcupacionAulaResponse.estadoDe(40, 41));
        assertEquals(OcupacionAulaResponse.SIN_AFORO, OcupacionAulaResponse.estadoDe(null, 10));
        assertEquals(OcupacionAulaResponse.SIN_AFORO, OcupacionAulaResponse.estadoDe(0, 0));
    }
}
