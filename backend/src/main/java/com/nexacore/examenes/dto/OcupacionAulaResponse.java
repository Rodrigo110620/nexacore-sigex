package com.nexacore.examenes.dto;

/**
 * DASH-03 (alerta de aforo): cuántos estudiantes están dentro de un aula del examen frente a su capacidad.
 * estado: LIBRE, CASI_LLENA (90 % o más), LLENA (llegó a su capacidad) o SIN_AFORO (capacidad no registrada).
 */
public record OcupacionAulaResponse(Integer idAmbiente, String nombre, Integer capacidad, int ocupados, String estado) {

    public static final String LIBRE = "LIBRE";
    public static final String CASI_LLENA = "CASI_LLENA";
    public static final String LLENA = "LLENA";
    public static final String SIN_AFORO = "SIN_AFORO";

    public static String estadoDe(Integer capacidad, int ocupados) {
        if (capacidad == null || capacidad <= 0) return SIN_AFORO;
        if (ocupados >= capacidad) return LLENA;
        return ocupados * 10 >= capacidad * 9 ? CASI_LLENA : LIBRE;
    }
}
