package com.nexacore.examenes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * DASH-06 / HU#7: una fila del reporte de intentos de ingreso incorrectos (ADMIN).
 *
 * @param tipo NO_CORRESPONDE (no inscrito en la materia), AULA_INCORRECTA (se presentó en otra aula) o NO_HABILITADO
 *             (excepción de no habilitado). Lo calcula {@link com.nexacore.examenes.services.MotivoIntento}.
 * @param etiqueta lo que se muestra en la insignia: «Aula incorrecta (660, debía 607)», «No habilitado: matrícula».
 * @param detalle el resto, legible (texto del control, acción tomada, observaciones); puede ser null.
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
        LocalDateTime fechaHora,
        String etiqueta,
        String detalle
) {
    public static final String NO_CORRESPONDE = "NO_CORRESPONDE";
    public static final String AULA_INCORRECTA = "AULA_INCORRECTA";
    public static final String NO_HABILITADO = "NO_HABILITADO";

    /** Sin etiqueta ni detalle (los calcula el servicio a partir del motivo). */
    public IntentoReporteResponse(Integer idIntento, Integer idExamen, String examen, LocalDate fechaExamen, LocalTime horaExamen,
                                  Integer idEstudiante, String estudiante, String codigoSis, String identificador, String motivo,
                                  String tipo, String personalControl, LocalDateTime fechaHora) {
        this(idIntento, idExamen, examen, fechaExamen, horaExamen, idEstudiante, estudiante, codigoSis, identificador, motivo,
                tipo, personalControl, fechaHora, null, null);
    }
}
