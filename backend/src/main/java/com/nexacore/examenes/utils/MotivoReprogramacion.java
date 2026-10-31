package com.nexacore.examenes.utils;

import java.util.regex.Pattern;

/**
 * Motivo de la reprogramación de un examen (BUG 8 del 2.º test run de QA). Misma regla que
 * frontend/src/utils/motivoReprogramacion.ts: obligatorio, de 10 a 100 caracteres, solo letras,
 * números y un espacio entre palabras; no puede ser solo números, una letra repetida ni texto sin
 * sentido. Se guarda en formato oración (los códigos de aula, como 690B, quedan en mayúscula).
 */
public final class MotivoReprogramacion {

    public static final int MIN = 10;
    public static final int MAX = 100;

    private static final Pattern PERMITIDOS = Pattern.compile("[\\p{L}0-9 ]+");
    private static final Pattern LETRA = Pattern.compile("\\p{L}");
    private static final Pattern MISMO_CARACTER = Pattern.compile("(?iu)(.)\\1+");

    private MotivoReprogramacion() {
    }

    /** @return el motivo en formato oración; si no es válido, lanza IllegalArgumentException con el motivo. */
    public static String validar(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException("Indica el motivo de la reprogramación");
        }
        if (!texto.equals(texto.strip()) || texto.contains("  ")) {
            throw new IllegalArgumentException("El motivo debe tener un solo espacio entre palabras, sin espacios al inicio ni al final");
        }
        if (!PERMITIDOS.matcher(texto).matches()) {
            throw new IllegalArgumentException("El motivo solo admite letras, números y espacios");
        }
        if (!LETRA.matcher(texto).find()) {
            throw new IllegalArgumentException("El motivo debe tener palabras, no solo números");
        }
        if (texto.length() < MIN) {
            throw new IllegalArgumentException("El motivo debe tener al menos " + MIN + " caracteres");
        }
        if (texto.length() > MAX) {
            throw new IllegalArgumentException("El motivo no puede superar " + MAX + " caracteres");
        }
        if (MISMO_CARACTER.matcher(texto.replace(" ", "")).matches()) {
            throw new IllegalArgumentException("El motivo no puede ser una misma letra repetida");
        }
        // Los códigos de aula ("690B", "L813") son válidos aunque tengan números.
        StringBuilder sinCodigos = new StringBuilder();
        for (String palabra : texto.split(" ")) {
            boolean codigo = palabra.chars().anyMatch(Character::isDigit) && ValidacionPalabras.esCodigoDeAmbiente(palabra);
            sinCodigos.append(codigo ? "aula" : palabra).append(' ');
        }
        String garabato = ValidacionPalabras.primerGarabato(sinCodigos.toString().strip());
        if (garabato != null) {
            throw new IllegalArgumentException("El motivo tiene una palabra que no es válida: " + garabato);
        }
        return TextoTraslado.formatoOracion(texto);
    }
}
