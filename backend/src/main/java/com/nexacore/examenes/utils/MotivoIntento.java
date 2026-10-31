package com.nexacore.examenes.utils;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import org.springframework.http.HttpStatus;
import java.util.Locale;

public final class MotivoIntento {
    private MotivoIntento() {}
    public static String validarYNormalizar(String texto) {
        if (texto == null || texto.isBlank()) throw invalido("El motivo del intento es obligatorio.");
        if (texto.length() > 65) throw invalido("El motivo no puede superar 65 caracteres.");
        if (!texto.matches("[\\p{L}0-9 .,;]+")) throw invalido("El motivo solo admite letras, números, espacios, punto, coma y punto y coma.");
        if (texto.startsWith(" ") || texto.endsWith(" ") || texto.contains("  ")) throw invalido("Usa un solo espacio entre palabras, sin espacios iniciales ni finales.");
        if (texto.codePoints().noneMatch(Character::isLetter)) throw invalido("El motivo debe incluir palabras, no solo números o signos.");
        if (texto.length() < 10) throw invalido("El motivo debe tener al menos 10 caracteres.");
        if (ValidacionPalabras.primerGarabato(texto.replaceAll("(?i)\\b(?:qr|ci|sis)\\b", "documento")) != null) throw invalido("El motivo contiene texto inconsistente. Escribe palabras válidas.");
        String normalizado = texto.toLowerCase(Locale.forLanguageTag("es"));
        var primera = java.util.regex.Pattern.compile("\\p{L}").matcher(normalizado);
        if (primera.find()) return normalizado.substring(0, primera.start()) + primera.group().toUpperCase(Locale.forLanguageTag("es")) + normalizado.substring(primera.end());
        return normalizado;
    }
    private static ControlIngresoException invalido(String mensaje) { return new ControlIngresoException(HttpStatus.BAD_REQUEST, mensaje); }
}
