package com.nexacore.examenes;

import com.nexacore.examenes.utils.ExpulsionValidaciones;
import com.nexacore.examenes.utils.MotivoEscrito;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** IMP-14: una sola regla para el motivo de expulsión y el del traslado de aula. */
class MotivoEscritoTests {

    private static String traslado(String motivo) {
        return MotivoEscrito.validar(motivo, "El motivo del traslado", "el traslado");
    }

    @Test
    void expulsionYTrasladoDanElMismoResultado() {
        for (String motivo : new String[] {"USO DE CI Y SIS EN AULA 690B", "  aula   llena,  pasa a la 691A  ", "Copia o plagio"}) {
            assertEquals(ExpulsionValidaciones.motivo(motivo), traslado(motivo), motivo);
        }
        // Formato oración: solo la primera letra en mayúscula; siglas y aulas con cifras se conservan.
        assertEquals("Uso de CI y SIS en aula 690B", traslado("USO DE CI Y SIS EN AULA 690B"));
        assertEquals("Aula llena, pasa a la 691A", traslado("  aula   llena,  pasa a la 691A  "));
    }

    @Test
    void aceptaLaDieresisYTildes() {
        assertEquals("Necesidad lingüística del estudiante", traslado("Necesidad lingüística del estudiante"));
        assertEquals("Pingüino y ñandú en el aula", ExpulsionValidaciones.motivo("PINGÜINO Y ÑANDÚ EN EL AULA"));
    }

    @Test
    void deDiezADoscientosCaracteresSinGarabatos() {
        String base = "Aula llena por el examen de otra materia que se programó a la misma hora en el bloque central, "
                + "así que el estudiante pasa al aula de al lado para rendir su examen con normalidad y sin problemas.";
        assertTrue(base.length() > 190 && base.length() <= MotivoEscrito.MAX, String.valueOf(base.length()));
        traslado(base);
        assertThrows(IllegalArgumentException.class, () -> traslado(base + " Además hubo ruido en el pasillo."));
        assertThrows(IllegalArgumentException.class, () -> traslado("Aula mal"));
        var vacio = assertThrows(IllegalArgumentException.class, () -> traslado("   "));
        assertEquals("El motivo del traslado es obligatorio", vacio.getMessage());
        assertThrows(IllegalArgumentException.class, () -> traslado("asdfgh qwrtyp zxcvb"));
        var sinLetras = assertThrows(IllegalArgumentException.class, () -> traslado("1234567890 12"));
        assertTrue(sinLetras.getMessage().contains("el traslado"), sinLetras.getMessage());
    }
}
