package com.nexacore.examenes;
import com.nexacore.examenes.utils.MotivoIntento;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class MotivoIntentoTests {
    @Test void rechazaDatosInvalidos() {
        for (String texto : new String[] {"", "Corto", "1234567890", "..........", "RRRRRRRRRR", "Aulaaaaaaaaaa", "Motivo  inválido", "Motivo inválido!", "a".repeat(66)})
            assertThrows(ControlIngresoException.class, () -> MotivoIntento.validarYNormalizar(texto));
    }
    @Test void aceptaPuntuacionYNormaliza() {
        assertEquals("Intentó ingresar; examen equivocado.", MotivoIntento.validarYNormalizar("INTENTÓ INGRESAR; EXAMEN EQUIVOCADO."));
        assertEquals("No corresponde, presenta ci 74839201", MotivoIntento.validarYNormalizar("No corresponde, presenta CI 74839201"));
    }
    @Test void aceptaElLimiteYRechazaExceso() {
        String texto = "No tiene celular y solicita ingreso manual por documento de papel";
        assertEquals(65, texto.length());
        assertEquals(texto, MotivoIntento.validarYNormalizar(texto));
        assertThrows(ControlIngresoException.class, () -> MotivoIntento.validarYNormalizar(texto + "a"));
    }
}
