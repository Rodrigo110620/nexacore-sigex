package com.nexacore.examenes.models;

import java.util.Locale;
import java.util.Set;

/** Condición o tipo de estudiante que se muestra en la identificación y el control de ingreso. */
public final class CondicionEstudiante {

    public static final String REGULAR = "REGULAR";
    public static final String POSTULANTE = "POSTULANTE";
    public static final Set<String> VALORES = Set.of(REGULAR, POSTULANTE);
    /** Para las anotaciones @Pattern de los requests. */
    public static final String PATRON = "^(?i)(REGULAR|POSTULANTE)$";

    private CondicionEstudiante() {
    }

    /** null o vacío → valorPorDefecto; si no, el valor en mayúsculas (ya validado con PATRON). */
    public static String normalizar(String condicion, String valorPorDefecto) {
        if (condicion == null || condicion.isBlank()) {
            return valorPorDefecto;
        }
        String valor = condicion.strip().toUpperCase(Locale.ROOT);
        if (!VALORES.contains(valor)) {
            throw new IllegalArgumentException("La condición del estudiante debe ser Regular o Postulante.");
        }
        return valor;
    }
}
