package com.nexacore.examenes.dto;

/** Totales de "Control del examen" (HU ACCS-01); habilitados + noHabilitados = total. */
public record ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados,
                                         /** Incidencias de la sesión actual (DASH-01): expulsiones vigentes, intentos
                                          *  incorrectos, excepciones, ingresos manuales, traslados y QR duplicados. */
                                         long incidencias,
                                         /** DASH-01: expulsados de la sesión actual. Siguen contando como ingresados
                                          *  (entraron al aula), con su propia marca; no son ausentes. */
                                         long expulsados,
                                         /** DASH-01: trasladados de aula en la sesión actual. Cuentan una sola vez en el
                                          *  examen, en su aula nueva. */
                                         long trasladados,
                                         /** DASH-03 (alerta de aforo): ocupación de cada aula del examen. */
                                         java.util.List<OcupacionAulaResponse> aulas) {
    public ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados) {
        this(total, habilitados, noHabilitados, ingresados, 0, 0, 0, java.util.List.of());
    }

    public ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados, long incidencias) {
        this(total, habilitados, noHabilitados, ingresados, incidencias, 0, 0, java.util.List.of());
    }

    public ResumenEstudiantesResponse(long total, long habilitados, long noHabilitados, long ingresados, long incidencias,
                                      long expulsados, long trasladados) {
        this(total, habilitados, noHabilitados, ingresados, incidencias, expulsados, trasladados, java.util.List.of());
    }

    /** Habilitados que aún no ingresaron. */
    public long ausentes() {
        return Math.max(0, habilitados - ingresados);
    }
}
