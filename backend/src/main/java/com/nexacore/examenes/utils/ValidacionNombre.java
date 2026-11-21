package com.nexacore.examenes.utils;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Nombres y apellidos de personas (usuarios y estudiantes). Además de «solo letras» (eso lo valida el patrón del
 * DTO), rechaza garabatos que el patrón deja pasar: «Aaaa», «Qwerty», «Bbbb Cccc», «Jajaja». Es más permisiva que
 * {@link ValidacionPalabras} a propósito: acepta apellidos aimaras, quechuas o extranjeros («Kjarkas», «Q'uispe»,
 * «Schmidt», «Llanque»). Misma regla que frontend/src/utils/validators.ts (nombreSinSentido).
 */
public final class ValidacionNombre {

    private static final Pattern VOCAL = Pattern.compile("[aeiouyáéíóúü]");
    private static final Pattern LETRA_TRIPLE = Pattern.compile("(\\p{L})\\1\\1");
    /** Cinco consonantes seguidas no se pronuncian en ningún nombre («Schmidt» tiene cuatro: «schm»). */
    private static final Pattern CINCO_CONSONANTES = Pattern.compile("[^aeiouyáéíóúü]{5}");
    /** «jajaja», «asdasd»: un mismo trozo repetido tres veces o más. */
    private static final Pattern PATRON_REPETIDO = Pattern.compile("(.{1,3})\\1{2,}");
    private static final Set<String> TECLADO = Set.of(
            "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop", "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl",
            "zxcv", "xcvb", "cvbn", "vbnm");
    private static final Pattern SEPARADORES = Pattern.compile("[ \\-]+");

    private ValidacionNombre() {
    }

    /** Motivo por el que no parece un nombre real, o null si está bien. {@code campo}: «El nombre», «Los apellidos». */
    public static String problema(String valor) {
        if (valor == null || valor.isBlank()) return null;
        // El apóstrofo es parte de la palabra (Q'uispe → quispe); se separa por espacios y guiones.
        for (String palabra : SEPARADORES.split(valor.strip().toLowerCase(Locale.ROOT).replace("'", ""))) {
            if (palabra.isEmpty()) continue;
            if (LETRA_TRIPLE.matcher(palabra).find()) return "no repitas la misma letra tres veces seguidas";
            if (!VOCAL.matcher(palabra).find()) return "cada palabra debe tener al menos una vocal";
            if (CINCO_CONSONANTES.matcher(palabra).find()) return "tiene demasiadas consonantes seguidas";
            if (palabra.length() >= 6 && PATRON_REPETIDO.matcher(palabra).matches()) return "no parece un nombre real";
            for (String fila : TECLADO) {
                if (palabra.contains(fila)) return "no parece un nombre real (letras seguidas del teclado)";
            }
        }
        return null;
    }

    /**
     * «jUAN carlos de la cruz» → «Juan Carlos De La Cruz»: mayúscula al inicio de cada palabra (también tras un
     * guion o un apóstrofo, «Q'Uispe» no: tras el apóstrofo sigue en minúscula) y el resto en minúscula.
     */
    public static String normalizar(String valor) {
        if (valor == null) return null;
        String limpio = valor.strip().replaceAll("\\s+", " ").toLowerCase(Locale.forLanguageTag("es"));
        StringBuilder sb = new StringBuilder(limpio.length());
        boolean inicio = true;
        for (char c : limpio.toCharArray()) {
            sb.append(inicio && Character.isLetter(c) ? Character.toUpperCase(c) : c);
            inicio = c == ' ' || c == '-';
        }
        return sb.toString();
    }
}
