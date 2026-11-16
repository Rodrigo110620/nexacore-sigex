package com.nexacore.examenes.dto;

/**
 * Respuesta al comprobar el código de activación (solo con el código correcto): si la administración
 * ya registró su C.I. se le muestra enmascarado; si no, debe escribirlo junto con su contraseña.
 */
public record EstadoActivacionResponse(String mensaje, boolean ciRegistrado, String ciEnmascarado) {
}
