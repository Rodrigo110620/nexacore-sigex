package com.nexacore.examenes.dto;

/** Totales de "Control del examen" (HU ACCS-01); habilitados + noHabilitados = total. */
public record ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados,
                                         /** Incidencias de la sesión actual (DASH-01): expulsiones vigentes, intentos
                                          *  incorrectos, excepciones, ingresos manuales, traslados y QR duplicados. */
                                         long incidencias) {
    public ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados) {
        this(total, habilitados, noHabilitados, ingresados, 0);
    }

    /** Habilitados que aún no ingresaron. */
    public long ausentes() {
        return Math.max(0, habilitados - ingresados);
    }
}
