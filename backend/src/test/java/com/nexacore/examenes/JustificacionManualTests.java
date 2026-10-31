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
    void limiteDeCaracteresIncluyeEspacios() {
        String texto = "No tiene celular y solicita ingreso manual por documento de papel";
        assertEquals(65, texto.length());
        assertEquals(texto, JustificacionManual.validarYNormalizar(texto));
        assertThrows(ControlIngresoException.class, () -> JustificacionManual.validarYNormalizar(texto + "a"));
    }

    @Test
    void rechazaGarabatosDelReporte() {
        for (String texto : new String[] {"t".repeat(40), "Bhgghjhgggyjy"}) {
            assertThrows(ControlIngresoException.class, () -> JustificacionManual.validarYNormalizar(texto));
        }
    }

    @Test
    void limpiaSaltosYEspaciosFinalesConservandoJustificacionesValidas() {
        assertEquals("No tiene celular", JustificacionManual.validarYNormalizar("No tiene celular  \r\n"));
        assertEquals("Celular apagado no presenta qr", JustificacionManual.validarYNormalizar("CELULAR APAGADO NO PRESENTA QR"));
        assertThrows(ControlIngresoException.class, () -> JustificacionManual.validarYNormalizar("Celular\napagado"));
    }
}
