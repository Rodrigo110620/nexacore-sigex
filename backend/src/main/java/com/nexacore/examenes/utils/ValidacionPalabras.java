package com.nexacore.examenes.utils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Detección de garabatos en textos libres (razón de inhabilitación, normas, ambientes).
 * Sin diccionario no se puede saber si una palabra existe, pero sí si tiene forma de palabra
 * en español: sílabas pronunciables, sin amontonar consonantes ni repetir sin sentido.
 * Misma regla que frontend/src/utils/palabras.ts.
 */
public final class ValidacionPalabras {

    private static final String VOCALES = "aeiouáéíóúü";
    /** Pares de consonantes con los que puede empezar una sílaba en español (tr, bl, ch...). */
    private static final Set<String> GRUPOS_CONSONANTES = Set.of(
            "ch", "ll", "rr", "ps", "bl", "br", "cl", "cr", "dl", "dr", "fl", "fr",
            "gl", "gr", "kl", "kr", "pl", "pr", "tl", "tr");
    private static final Pattern LETRA_TRIPLE = Pattern.compile("(.)\\1\\1");
    private static final Pattern PATRON_REPETIDO = Pattern.compile("(.{1,3})\\1{2,}");
    private static final Pattern SEPARADORES = Pattern.compile("[\\s.,;:()¿?¡!\"'/%\\-—]+");
    private static final Pattern SOLO_NUMEROS = Pattern.compile("\\d+");
    /** Número con abreviatura corta: "2do", "1ra", "30min". */
    private static final Pattern NUMERO_ABREVIADO = Pattern.compile("\\d+\\p{L}{1,3}");
    private static final Pattern AULA_NUMERICA = Pattern.compile("\\d{3}(?:[A-Z][A-Z0-9]{0,5})?");
    private static final Pattern LETRA_Y_NUMERO = Pattern.compile("[A-Z]\\d{3}");
    private static final Pattern ABREVIATURA = Pattern.compile("[A-Z]{2,12}");

    private ValidacionPalabras() {
    }

    /** Rechaza "fsfasfsaf", "qwerty", "asdfgh" o "jajaja". Recorrido lineal, sin regex anidadas. */
    public static boolean pareceUnaPalabra(String palabra) {
        String p = palabra.toLowerCase(Locale.ROOT);
        if (LETRA_TRIPLE.matcher(p).find() || PATRON_REPETIDO.matcher(p).matches()) {
            return false;
        }
        List<StringBuilder> tramos = new ArrayList<>();
        List<Boolean> esVocalTramo = new ArrayList<>();
        for (int i = 0; i < p.length(); i++) {
            boolean vocal = esVocal(p, i);
            int ultimo = tramos.size() - 1;
            if (ultimo >= 0 && esVocalTramo.get(ultimo) == vocal) {
                tramos.get(ultimo).append(p.charAt(i));
            } else {
                tramos.add(new StringBuilder().append(p.charAt(i)));
                esVocalTramo.add(vocal);
            }
        }
        if (!esVocalTramo.contains(true)) {
            return false;
        }
        for (int i = 0; i < tramos.size(); i++) {
            String t = tramos.get(i).toString();
            int n = t.length();
            boolean valido;
            if (esVocalTramo.get(i)) {
                valido = n <= 3;
            } else if (i == 0) {
                valido = n == 1 || (n == 2 && GRUPOS_CONSONANTES.contains(t));
            } else if (i == tramos.size() - 1) {
                valido = n <= 2;
            } else {
                valido = n <= 3 || (n == 4 && GRUPOS_CONSONANTES.contains(t.substring(2)));
            }
            if (!valido) {
                return false;
            }
        }
        return true;
    }

    /**
     * Primera palabra con forma de garabato dentro de un texto libre, o null si todas pasan.
     * Ignora la puntuación y acepta números ("30 minutos") y ordinales ("2do parcial").
     */
    public static String primerGarabato(String texto) {
        for (String fragmento : SEPARADORES.split(texto)) {
            if (fragmento.isEmpty() || SOLO_NUMEROS.matcher(fragmento).matches()
                    || NUMERO_ABREVIADO.matcher(fragmento).matches()) {
                continue;
            }
            if (fragmento.chars().anyMatch(Character::isDigit) || !pareceUnaPalabra(fragmento)) {
                return fragmento;
            }
        }
        return null;
    }

    /**
     * Formas de los ambientes reales: aula numérica con sufijo opcional que empieza con letra
     * ("692F", "682L0IN", "690MAT"), letra + 3 dígitos ("L813") o abreviatura legible ("INFLAB").
     */
    public static boolean esCodigoDeAmbiente(String nombre) {
        String n = nombre.toUpperCase(Locale.ROOT);
        return AULA_NUMERICA.matcher(n).matches()
                || LETRA_Y_NUMERO.matcher(n).matches()
                || (ABREVIATURA.matcher(n).matches() && pareceUnaPalabra(n));
    }

    private static boolean esVocal(String p, int i) {
        char c = p.charAt(i);
        if (VOCALES.indexOf(c) >= 0) {
            return true;
        }
        // "y" suena a vocal al final o antes de consonante: "muy", "y", "hay".
        return c == 'y' && (i + 1 == p.length() || VOCALES.indexOf(p.charAt(i + 1)) < 0);
    }
}
