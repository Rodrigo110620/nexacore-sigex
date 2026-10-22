package com.nexacore.examenes.security;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Requisitos para contraseñas elegidas por el usuario, no para claves temporales. */
public final class PasswordPolicy {

    private PasswordPolicy() {}

    /**
     * Una cuenta de estudiante no puede usar como contraseña su código SIS, su CI ni su nombre:
     * son datos que conoce cualquiera de su curso.
     */
    public static void validarSinDatosDelEstudiante(String password, String codigoSis, String ci, String nombre) {
        String clave = password == null ? "" : password.toLowerCase(Locale.ROOT);
        boolean usaDatos = (codigoSis != null && !codigoSis.isBlank() && clave.contains(codigoSis))
                || (ci != null && !ci.isBlank() && clave.contains(ci.toLowerCase(Locale.ROOT)));
        for (String palabra : (nombre == null ? "" : nombre).toLowerCase(Locale.ROOT).split("\\s+")) {
            usaDatos |= palabra.length() >= 3 && clave.contains(palabra);
        }
        if (usaDatos) {
            throw new IllegalArgumentException("La contraseña no puede contener tu nombre, tu código SIS ni tu CI.");
        }
    }

    public static void validate(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("La nueva contraseña es obligatoria");
        }
        if (password.codePointCount(0, password.length()) < 8) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 8 caracteres");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("La nueva contraseña es demasiado larga");
        }
        if (password.codePoints().noneMatch(Character::isUpperCase)) {
            throw new IllegalArgumentException("La nueva contraseña debe incluir una mayúscula");
        }
        if (password.codePoints().noneMatch(Character::isLowerCase)) {
            throw new IllegalArgumentException("La nueva contraseña debe incluir una minúscula");
        }
        if (password.codePoints().noneMatch(Character::isDigit)) {
            throw new IllegalArgumentException("La nueva contraseña debe incluir un número");
        }
        if (password.codePoints().noneMatch(PasswordPolicy::isSymbol)) {
            throw new IllegalArgumentException("La nueva contraseña debe incluir un símbolo");
        }
    }

    private static boolean isSymbol(int codePoint) {
        int type = Character.getType(codePoint);
        return type == Character.CONNECTOR_PUNCTUATION
                || type == Character.DASH_PUNCTUATION
                || type == Character.START_PUNCTUATION
                || type == Character.END_PUNCTUATION
                || type == Character.INITIAL_QUOTE_PUNCTUATION
                || type == Character.FINAL_QUOTE_PUNCTUATION
                || type == Character.OTHER_PUNCTUATION
                || type == Character.MATH_SYMBOL
                || type == Character.CURRENCY_SYMBOL
                || type == Character.MODIFIER_SYMBOL
                || type == Character.OTHER_SYMBOL;
    }
}
