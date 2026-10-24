package com.nexacore.examenes.utils;

import java.text.Normalizer;
import java.util.Locale;

/** Texto de búsqueda sin tildes y en minúsculas: "Físic" encuentra "Física" y "fisic" también. */
public final class TextoBusqueda {

    /**
     * Letras con tilde y sus equivalentes sin tilde, para quitar las tildes en la base con
     * translate(lower(columna), CON_TILDE, SIN_TILDE). Mismo largo y mismo orden.
     */
    public static final String CON_TILDE = "áéíóúàèìòùäëïöüâêîôûñ";
    public static final String SIN_TILDE = "aeiouaeiouaeiouaeioun";

    private TextoBusqueda() {
    }

    public static String sinTildes(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
