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
