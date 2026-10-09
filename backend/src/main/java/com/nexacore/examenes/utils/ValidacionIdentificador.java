package com.nexacore.examenes.utils;

import java.util.regex.Pattern;

/**
 * Formato del código universitario y del C.I. al identificar al estudiante (BUG-A01),
 * antes de ejecutar la búsqueda. Misma regla que frontend/src/utils/identificacionValidators.ts.
 */
public final class ValidacionIdentificador {

    public static final int DIGITOS_CODIGO = 9;
    public static final int DIGITOS_CI = 8;

    private static final Pattern SOLO_DIGITOS = Pattern.compile("[0-9]+");
    private static final Pattern SOLO_CEROS = Pattern.compile("0+");
    private static final Pattern MISMO_DIGITO = Pattern.compile("(\\d)\\1+");

    private ValidacionIdentificador() {
    }

    /** @throws IllegalArgumentException con el motivo si el código universitario no es válido (400) */
    public static void validarCodigoUniversitario(String valor) {
        String campo = "El código universitario";
        validarDigitos(valor, campo, DIGITOS_CODIGO);
        if (MISMO_DIGITO.matcher(valor).matches()) {
            throw new IllegalArgumentException(campo + " no puede ser un mismo dígito repetido");
        }
        if (esSecuencia(valor)) {
            throw new IllegalArgumentException(campo + " no puede ser una secuencia ascendente o descendente");
        }
        if (esPatronRepetido(valor)) {
            throw new IllegalArgumentException(campo + " no puede ser un patrón repetido");
        }
    }

    /** @throws IllegalArgumentException con el motivo si el C.I. no es válido (400) */
    public static void validarCi(String valor) {
        validarDigitos(valor, "El C.I.", DIGITOS_CI);
    }

    private static void validarDigitos(String valor, String campo, int digitos) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(campo + " es obligatorio");
        }
        if (valor.codePoints().anyMatch(Character::isLetter)) {
            throw new IllegalArgumentException(campo + " no puede contener letras");
        }
        if (valor.codePoints().anyMatch(Character::isWhitespace)) {
            throw new IllegalArgumentException(campo + " no puede contener espacios");
        }
        if (!SOLO_DIGITOS.matcher(valor).matches()) {
            throw new IllegalArgumentException(campo + " no puede contener puntos, comas ni caracteres especiales");
        }
        if (valor.length() != digitos) {
            throw new IllegalArgumentException(campo + " debe tener exactamente " + digitos + " dígitos");
        }
        if (SOLO_CEROS.matcher(valor).matches()) {
            throw new IllegalArgumentException(campo + " no puede ser solo ceros");
        }
    }

    /** Cada dígito es el anterior +1 (123456789) o -1 (987654321). */
    private static boolean esSecuencia(String digitos) {
        int paso = digitos.charAt(1) - digitos.charAt(0);
        if (Math.abs(paso) != 1) {
            return false;
        }
        for (int i = 2; i < digitos.length(); i++) {
            if (digitos.charAt(i) - digitos.charAt(i - 1) != paso) {
                return false;
            }
        }
        return true;
    }

    /** Un bloque de 2 a 4 dígitos que se repite: 121212121, 123123123, 123412341. */
    private static boolean esPatronRepetido(String digitos) {
        for (int largo = 2; largo <= 4; largo++) {
            boolean repite = true;
            for (int i = largo; i < digitos.length() && repite; i++) {
                repite = digitos.charAt(i) == digitos.charAt(i - largo);
            }
            if (repite) {
                return true;
            }
        }
        return false;
    }
}
