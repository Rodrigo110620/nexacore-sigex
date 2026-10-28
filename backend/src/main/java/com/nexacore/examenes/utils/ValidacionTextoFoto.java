package com.nexacore.examenes.utils;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Textos de la revisión de fotos (HU#6, BUG-E01 a E10 de QA). Misma regla que
 * frontend/src/utils/textoFotoValidators.ts.
 * <ul>
 *   <li><b>Detalle del reporte</b> (control): opcional; solo letras y espacios, de 10 a 65 caracteres.</li>
 *   <li><b>Motivo del rechazo</b> (admin): obligatorio; letras, espacios, coma y punto, sin números,
 *       de 5 a 200 caracteres.</li>
 * </ul>
 * Ninguno puede ser una letra repetida ni un garabato, y se guardan en formato oración.
 */
public final class ValidacionTextoFoto {

    public static final int DETALLE_MIN = 10;
    public static final int DETALLE_MAX = 65;
    public static final int MOTIVO_MIN = 5;
    public static final int MOTIVO_MAX = 200;

    private static final Pattern SOLO_LETRAS_Y_ESPACIOS = Pattern.compile("[\\p{L} ]+");
    private static final Pattern LETRAS_COMA_Y_PUNTO = Pattern.compile("[\\p{L} .,]+");
    private static final Pattern LETRA = Pattern.compile("\\p{L}");
    private static final Pattern DIGITO = Pattern.compile("\\d");
    private static final Pattern MISMO_CARACTER = Pattern.compile("(?iu)(.)\\1+");
    private static final Pattern ESPACIOS = Pattern.compile("\\s+");
    private static final Locale ES = Locale.forLanguageTag("es-BO");

    private ValidacionTextoFoto() {
    }

    /** @return el detalle normalizado, o null si no se escribió nada */
    public static String detalleReporte(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        String limpio = ESPACIOS.matcher(texto.strip()).replaceAll(" ");
        String campo = "El detalle";
        if (!SOLO_LETRAS_Y_ESPACIOS.matcher(limpio).matches()) {
            throw new IllegalArgumentException(campo + " solo admite letras y espacios");
        }
        return comun(limpio, campo, DETALLE_MIN, DETALLE_MAX);
    }

    /** @return el motivo normalizado */
    public static String motivoRechazo(String texto) {
        String campo = "El motivo del rechazo";
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException("Indica el motivo del rechazo");
        }
        String limpio = ESPACIOS.matcher(texto.strip()).replaceAll(" ");
        if (DIGITO.matcher(limpio).find()) {
            throw new IllegalArgumentException(campo + " no puede contener números");
        }
        if (!LETRAS_COMA_Y_PUNTO.matcher(limpio).matches()) {
            throw new IllegalArgumentException(campo + " solo admite letras, espacios, coma y punto");
        }
        if (!LETRA.matcher(limpio).find()) {
            throw new IllegalArgumentException(campo + " debe tener letras, no solo signos");
        }
        return comun(limpio, campo, MOTIVO_MIN, MOTIVO_MAX);
    }

    private static String comun(String limpio, String campo, int min, int max) {
        if (limpio.length() < min) {
            throw new IllegalArgumentException(campo + " debe tener al menos " + min + " caracteres");
        }
        if (limpio.length() > max) {
            throw new IllegalArgumentException(campo + " no puede superar " + max + " caracteres");
        }
        if (MISMO_CARACTER.matcher(limpio.replaceAll("[\\s.,]", "")).matches()) {
            throw new IllegalArgumentException(campo + " no puede ser una misma letra repetida");
        }
        String garabato = ValidacionPalabras.primerGarabato(limpio);
        if (garabato != null) {
            throw new IllegalArgumentException(campo + " tiene una palabra que no es válida: " + garabato);
        }
        return aOracion(limpio);
    }

    /** Formato oración: la primera letra en mayúscula y el resto en minúscula. */
    static String aOracion(String texto) {
        String minusculas = texto.toLowerCase(ES);
        int i = 0;
        while (i < minusculas.length() && !Character.isLetter(minusculas.charAt(i))) {
            i++;
        }
        if (i == minusculas.length()) {
            return minusculas;
        }
        return minusculas.substring(0, i) + minusculas.substring(i, i + 1).toUpperCase(ES) + minusculas.substring(i + 1);
    }
}
