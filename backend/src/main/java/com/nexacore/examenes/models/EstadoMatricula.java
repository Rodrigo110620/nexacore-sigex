package com.nexacore.examenes.models;

import java.util.Locale;
import java.util.Set;

/** Estado de matrícula del estudiante (IMP-06). */
public final class EstadoMatricula {

    public static final String MATRICULADO = "MATRICULADO";
    public static final String NO_MATRICULADO = "NO_MATRICULADO";
    public static final Set<String> VALORES = Set.of(MATRICULADO, NO_MATRICULADO);
    /** Para las anotaciones @Pattern de los requests. */
    public static final String PATRON = "^$|^(?i)(MATRICULADO|NO_MATRICULADO)$";
    /** Teléfono o celular: 7 u 8 dígitos que empiezan con 2, 3, 4, 6 o 7 (la misma regla que la V32). */
    public static final String REGEX_TELEFONO = "^[23467]\\d{6,7}$";
    /** Igual que REGEX_TELEFONO, pero vacío = sin teléfono. */
    public static final String PATRON_TELEFONO = "^$|" + REGEX_TELEFONO;

    private EstadoMatricula() {
    }

    /** null o vacío → valorPorDefecto; si no, el valor en mayúsculas (ya validado con PATRON). */
    public static String normalizar(String estado, String valorPorDefecto) {
        if (estado == null || estado.isBlank()) {
            return valorPorDefecto;
        }
        String valor = estado.strip().toUpperCase(Locale.ROOT).replace(' ', '_');
        if (!VALORES.contains(valor)) {
            throw new IllegalArgumentException("El estado de matrícula debe ser Matriculado o No matriculado.");
        }
        return valor;
    }

    /**
     * Teléfono sin espacios. null → valorActual (no se envió); vacío → null (se quita el teléfono).
     */
    public static String normalizarTelefono(String telefono, String telefonoActual) {
        if (telefono == null) {
            return telefonoActual;
        }
        String limpio = telefono.replaceAll("\\s+", "");
        if (limpio.isEmpty()) {
            return null;
        }
        if (!limpio.matches(REGEX_TELEFONO)) {
            throw new IllegalArgumentException("El teléfono debe tener 7 u 8 dígitos y empezar con 2, 3, 4, 6 o 7.");
        }
        return limpio;
    }
}
