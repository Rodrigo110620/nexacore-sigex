package com.nexacore.examenes.utils;

import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Textos libres opcionales del control de ingreso (detalle de la denegación, BUG-D02).
 * Permitidos: letras, vocales con tilde, ü/Ü, ñ/Ñ, números, espacios, saltos de línea y . , : ; - ( ) ¿ ? ¡ !
 * Para las reglas, un salto de línea cuenta como un espacio.
 * Misma regla que frontend/src/utils/textoLibreValidators.ts.
 */
public final class ValidacionTextoLibre {

    private static final Pattern NO_PERMITIDO = Pattern.compile("[^A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9 \\r\\n.,:;()¿?¡!-]");
    private static final Pattern LETRA_O_NUMERO = Pattern.compile("[A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9]");
    private static final Pattern MISMO_CARACTER = Pattern.compile("(?iu)(.)\\1+");

    private ValidacionTextoLibre() {
    }

    /**
     * @param campo nombre del campo para el mensaje, p. ej. "El detalle adicional"
     * @return el texto sin espacios en los extremos, o null si no se escribió nada
     * @throws IllegalArgumentException con el motivo si el texto no es válido (400)
     */
    public static String validarOpcional(String texto, String campo, int min, int max) {
        if (texto == null || texto.isEmpty()) {
            return null;
        }
        if (texto.isBlank()) {
            throw new IllegalArgumentException(campo + " no puede tener solo espacios");
        }
        if (texto.length() > max) {
            throw new IllegalArgumentException(campo + " no puede superar " + max + " caracteres");
        }
        String limpio = texto.strip();
        if (NO_PERMITIDO.matcher(limpio).find()) {
            throw new IllegalArgumentException(campo + " tiene caracteres no permitidos: " + noPermitidos(limpio));
        }
        if (!LETRA_O_NUMERO.matcher(limpio).find()) {
            throw new IllegalArgumentException(campo + " debe tener letras o números, no solo signos");
        }
        if (MISMO_CARACTER.matcher(limpio.replaceAll("\\s", "")).matches()) {
            throw new IllegalArgumentException(campo + " no puede ser un mismo carácter repetido");
        }
        if (limpio.length() < min) {
            throw new IllegalArgumentException(campo + " debe tener al menos " + min + " caracteres");
        }
        return limpio;
    }

    /** Los caracteres no permitidos, sin repetir y en el orden en que aparecen. */
    private static String noPermitidos(String texto) {
        return NO_PERMITIDO.matcher(texto).results()
                .map(r -> r.group().equals("\t") ? "tabulación" : r.group())
                .distinct()
                .collect(Collectors.joining(" "));
    }
}
