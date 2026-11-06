package com.nexacore.examenes.utils;

import java.util.Locale;
import java.util.regex.Pattern;

/** Reglas de texto del traslado de ambiente (INCI-03), iguales en el frontend (ReasignarAmbienteModal). */
public final class TextoTraslado {

    public static final int MOTIVO_MIN = 10;
    public static final int MAX = 65;

    /** Motivo: letras (con tildes, ü y ñ), números y espacios simples. */
    private static final Pattern MOTIVO = Pattern.compile("^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9 ]+$");
    /** Observación: solo letras (con tildes, ü y ñ) y espacios simples. */
    private static final Pattern OBSERVACION = Pattern.compile("^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ ]+$");
    private static final Locale ES = Locale.forLanguageTag("es");

    private TextoTraslado() {
    }

    public static boolean motivoValido(String texto) {
        return MOTIVO.matcher(texto).matches();
    }

    public static boolean observacionValida(String texto) {
        return OBSERVACION.matcher(texto).matches();
    }

    /**
     * Devuelve true si el texto contiene 4 o más caracteres idénticos consecutivos
     * (ej: "rrrr", "WWWW", "aaaab"). Se usa para rechazar secuencias de teclado sin sentido.
     */
    public static boolean tieneRepetidosConsecutivos(String texto) {
        if (texto == null || texto.length() < 4) {
            return false;
        }
        for (int i = 0; i < texto.length() - 3; i++) {
            char c = texto.charAt(i);
            if (c == texto.charAt(i + 1) && c == texto.charAt(i + 2) && c == texto.charAt(i + 3)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Devuelve true si el texto contiene al menos una vocal (incluye tildes y ü).
     * Se usa para evitar cadenas compuestas solo por consonantes sin significado.
     */
    public static boolean tieneAlMenosUnaVocal(String texto) {
        if (texto == null || texto.isEmpty()) {
            return false;
        }
        return texto.toLowerCase(ES).matches(".*[aeiouáéíóúü].*");
    }

    /**
     * Devuelve el máximo de consonantes seguidas (sin vocal entre medio).
     * Se usa para rechazar cadenas como "sdwq" dentro de "Assdwqsasda".
     */
    public static int maxConsonantesSeguidas(String texto) {
        if (texto == null || texto.isEmpty()) {
            return 0;
        }
        int max = 0;
        int actual = 0;
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (esConsonante(c)) {
                actual += 1;
                max = Math.max(max, actual);
            } else {
                actual = 0;
            }
        }
        return max;
    }

    private static boolean esConsonante(char c) {
        return "bcdfghjklmñpqrstvwxyzBCDFGHJKLMÑPQRSTVWXYZ".indexOf(c) >= 0;
    }

    /**
     * Devuelve la proporción de vocales sobre el total de letras (ignora espacios y dígitos).
     * Se usa para rechazar cadenas sin sentido como "Sdadsasasds".
     */
    public static double proporcionVocales(String texto) {
        if (texto == null || texto.isEmpty()) {
            return 0;
        }
        String soloLetras = texto.replaceAll("[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ]", "");
        if (soloLetras.isEmpty()) {
            return 0;
        }
        long vocales = soloLetras.chars()
                .mapToObj(ch -> (char) ch)
                .filter(ch -> "aeiouáéíóúüAEIOUÁÉÍÓÚÜ".indexOf(ch) >= 0)
                .count();
        return (double) vocales / soloLetras.length();
    }

    /**
     * Formato oración: primera letra en mayúscula y el resto en minúscula, salvo las palabras con
     * números, que son códigos de aula y se dejan en mayúscula ("Se trasladó al aula 690B").
     */
    public static String formatoOracion(String texto) {
        String[] palabras = texto.toLowerCase(ES).split(" ", -1);
        for (int i = 0; i < palabras.length; i++) {
            if (palabras[i].chars().anyMatch(Character::isDigit)) palabras[i] = palabras[i].toUpperCase(ES);
        }
        String resultado = String.join(" ", palabras);
        return resultado.isEmpty() ? resultado
                : resultado.substring(0, 1).toUpperCase(ES) + resultado.substring(1);
    }
}
