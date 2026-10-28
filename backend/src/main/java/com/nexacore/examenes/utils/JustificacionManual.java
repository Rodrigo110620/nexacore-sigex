package com.nexacore.examenes.utils;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import org.springframework.http.HttpStatus;
import java.util.Locale;

/** Validación y normalización de INCI-02 (BUG-B01 a B06). */
public final class JustificacionManual {
    private JustificacionManual() {}

    public static String validarYNormalizar(String texto) {
        if (texto == null || texto.isBlank()) {
            throw invalida("La justificación del ingreso manual es obligatoria.");
        }
        if (texto.codePoints().filter(Character::isLetter).count() > 65) {
            throw invalida("La justificación no puede superar las 65 letras.");
        }
        if (!texto.matches("[\\p{L} ]+")) {
            throw invalida("La justificación solo permite letras y un espacio entre palabras.");
        }
        if (texto.startsWith(" ") || texto.endsWith(" ") || texto.contains("  ")) {
            throw invalida("Solo se permite un espacio entre palabras en la justificación del ingreso manual, sin espacios iniciales ni finales.");
        }
        if (texto.codePointCount(0, texto.length()) < 10) {
            throw invalida("La justificación debe tener al menos 10 caracteres.");
        }
        String minusculas = texto.toLowerCase(Locale.forLanguageTag("es"));
        int finPrimera = minusculas.offsetByCodePoints(0, 1);
        return minusculas.substring(0, finPrimera).toUpperCase(Locale.forLanguageTag("es")) + minusculas.substring(finPrimera);
    }

    private static ControlIngresoException invalida(String mensaje) {
        return new ControlIngresoException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
