package com.nexacore.examenes.utils;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * IMP-14: una sola regla para los motivos escritos (expulsión y traslado de aula): espacios simples, de 10 a 200
 * caracteres, con palabras y sin garabatos, y en formato de oración que conserva siglas (CI, SIS, QR…) y códigos
 * con cifras («690B»). Letras con tildes, ñ y ü. La misma regla está en el frontend (motivoEscrito.ts).
 */
public final class MotivoEscrito {

    public static final int MIN = 10;
    public static final int MAX = 200;

    // Una frase en mayúsculas no distingue palabras de siglas: lista explícita ya reconocida por INCI-01.
    private static final Set<String> SIGLAS = Set.of("CI", "SIS", "QR", "PDF", "C");
    private static final Pattern PALABRA = Pattern.compile("[\\p{L}\\p{N}]+");
    private static final Pattern LETRA = Pattern.compile("\\p{L}");
    private static final Locale ES = Locale.forLanguageTag("es");

    private MotivoEscrito() {
    }

    /** Quita extremos y deja un solo espacio entre palabras; los límites se cuentan después. */
    public static String normalizarEspacios(String motivo) {
        return motivo == null ? null : motivo.strip().replaceAll(" +", " ");
    }

    /**
     * Valida y normaliza el motivo. {@code campo}: «El motivo de expulsión»; {@code queExplica}: «la expulsión».
     * Lanza IllegalArgumentException con el mensaje para el usuario.
     */
    public static String validar(String motivo, String campo, String queExplica) {
        motivo = normalizarEspacios(motivo);
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException(campo + " es obligatorio");
        }
        String texto = ValidacionTextoLibre.validarOpcional(motivo, campo, MIN, MAX);
        if (texto.contains("\n") || texto.contains("\r")) {
            throw new IllegalArgumentException("El motivo solo permite un espacio entre palabras");
        }
        if (texto.codePoints().noneMatch(Character::isLetter)) {
            throw new IllegalArgumentException("El motivo debe contener palabras que expliquen " + queExplica);
        }
        // Excepciones conocidas; la heurística no garantiza el significado de una frase.
        String garabato = ValidacionPalabras.primerGarabato(texto.replaceAll(
                "(?i)\\b(?:qr|ci|sis|whatsapp|pdf|chatgpt|c|smartwatch)\\b", "documento"));
        if (garabato != null) {
            throw new IllegalArgumentException("El motivo contiene contenido no válido: " + garabato);
        }
        var primeraLetra = LETRA.matcher(texto);
        int inicioOracion = primeraLetra.find() ? primeraLetra.start() : -1;
        return PALABRA.matcher(texto).replaceAll(coincidencia -> {
            String palabra = coincidencia.group();
            String sigla = palabra.toUpperCase(ES);
            if (SIGLAS.contains(sigla)) return sigla;
            // Conserva la escritura de códigos con cifras («690B»).
            if (palabra.chars().anyMatch(c -> c >= '0' && c <= '9')) return palabra;
            String minusculas = palabra.toLowerCase(ES);
            return coincidencia.start() == inicioOracion
                    ? Character.toUpperCase(minusculas.charAt(0)) + minusculas.substring(1) : minusculas;
        });
    }
}
