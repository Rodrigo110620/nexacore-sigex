package com.nexacore.examenes;

import com.nexacore.examenes.utils.JustificacionManual;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class JustificacionManualTests {
    @Test
    void normalizaMinusculasMayusculasYTildes() {
        for (String texto : new String[] {"celular apagado", "CELULAR APAGADO", "cElUlAr aPaGaDo"}) {
            assertEquals("Celular apagado", JustificacionManual.validarYNormalizar(texto));
        }
        assertEquals("Árbol caído", JustificacionManual.validarYNormalizar("ÁRBOL CAÍDO"));
    }

    @Test
    void aceptaSesentaYCincoLetrasSinContarEspaciosYRechazaSesentaYSeis() {
        String texto = "á".repeat(32) + " " + "ñ".repeat(33);
        assertEquals("Á" + texto.substring(1), JustificacionManual.validarYNormalizar(texto));
        assertThrows(ControlIngresoException.class, () -> JustificacionManual.validarYNormalizar(texto + "ü"));
    }
}
