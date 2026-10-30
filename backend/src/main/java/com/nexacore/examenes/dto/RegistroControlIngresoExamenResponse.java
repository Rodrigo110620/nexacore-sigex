package com.nexacore.examenes.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Registro auditable de autorización o denegación para la vista general de un examen. */
public record RegistroControlIngresoExamenResponse(
        Integer idRegistro,
        Integer idEstudiante,
        String estudiante,
        String codigoSis,
        String resultado,
        String causa,
        String observaciones,
        List<String> verificacionesAdicionales,
        String usuarioControl,
        LocalDateTime fechaHora,
        String tipoIngreso,
        String justificacionManual,
        String ambienteIngreso,
        Boolean reasignado,
        /** INCI-03: aula original si lo trasladaron (observación del reporte final); null si no. */
        String trasladadoDesde,
        /** INCI-03: motivo del traslado de ambiente; null si no hubo reasignación. */
        String motivoTraslado,
        /** INCI-03: observación opcional del traslado de ambiente; null si no hubo reasignación. */
        String observacionTraslado,
        List<IncidenciaRegistradaResponse> incidencias
) {}
