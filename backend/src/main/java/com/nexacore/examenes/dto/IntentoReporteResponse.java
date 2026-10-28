package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * DASH-06 / HU#7: una fila del reporte de intentos de ingreso incorrectos (ADMIN).
 *
 * @param tipo NO_CORRESPONDE (examen que no le corresponde) o AULA_INCORRECTA (se presentó en otra aula)
 */
public record IntentoReporteResponse(
        Integer idIntento,
        Integer idExamen,
        String examen,
        LocalDate fechaExamen,
        LocalTime horaExamen,
        Integer idEstudiante,
        String estudiante,
        String codigoSis,
        String identificador,
        String motivo,
        String tipo,
        String personalControl,
        /** Hora del servidor (Bolivia) en que se registró el intento. */
        LocalDateTime fechaHora
) {
    public static final String NO_CORRESPONDE = "NO_CORRESPONDE";
    public static final String AULA_INCORRECTA = "AULA_INCORRECTA";
}
