package com.nexacore.examenes.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AutorizarIngresoRequest(
        @NotNull Integer idEstudiante,
        @NotNull Integer idExamen,
        @Size(max = 1000) String observaciones,
        boolean identidadVerificada,
        @Size(max = 20) List<@Size(max = 200) String> verificacionesAdicionales,
        @Valid @Size(max = 20) List<IncidenciaIngresoRequest> incidencias,
        /** Solo al denegar: "Detalle adicional" del modal (opcional, BUG-D02). */
        String detalleDenegacion,
        /** ISO-8601 con offset tomado del dispositivo que hizo la lectura. */
        String fechaHoraDispositivo,
        boolean ingresoManual,
        @Size(max = 1000) String justificacionManual
) {
    public AutorizarIngresoRequest(Integer idEstudiante, Integer idExamen, String observaciones,
                                   boolean identidadVerificada, List<String> verificacionesAdicionales,
                                   List<IncidenciaIngresoRequest> incidencias, String detalleDenegacion,
                                   String fechaHoraDispositivo) {
        this(idEstudiante, idExamen, observaciones, identidadVerificada, verificacionesAdicionales,
                incidencias, detalleDenegacion, fechaHoraDispositivo, false, null);
    }
    public AutorizarIngresoRequest(Integer idEstudiante, Integer idExamen, String observaciones,
                                   boolean identidadVerificada,
                                   List<String> verificacionesAdicionales,
                                   List<IncidenciaIngresoRequest> incidencias) {
        this(idEstudiante, idExamen, observaciones, identidadVerificada, verificacionesAdicionales, incidencias, null, null);
    }

    /** Compatibilidad para clientes y pruebas que ya enviaban el detalle de denegación. */
    public AutorizarIngresoRequest(Integer idEstudiante, Integer idExamen, String observaciones,
                                   boolean identidadVerificada, List<String> verificacionesAdicionales,
                                   List<IncidenciaIngresoRequest> incidencias, String detalleDenegacion) {
        this(idEstudiante, idExamen, observaciones, identidadVerificada, verificacionesAdicionales, incidencias,
                detalleDenegacion, null);
    }

    public AutorizarIngresoRequest {
        verificacionesAdicionales = verificacionesAdicionales == null ? List.of() : List.copyOf(verificacionesAdicionales);
        incidencias = incidencias == null ? List.of() : List.copyOf(incidencias);
    }
}
