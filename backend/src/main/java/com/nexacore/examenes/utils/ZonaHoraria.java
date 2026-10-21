package com.nexacore.examenes.utils;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.TimeZone;

/**
 * Zona horaria de SIGEX. Las fechas se guardan sin zona (timestamp), así que el backend tiene que
 * trabajar en la hora de Bolivia: si corre en UTC (como en el contenedor del servidor), Java y la
 * conexión a PostgreSQL (el driver toma la zona de Java) guardaban la hora 4 horas adelantada.
 */
public final class ZonaHoraria {

    public static final String POR_DEFECTO = "America/La_Paz";

    private ZonaHoraria() {
    }

    /** APP_TIMEZONE (variable de entorno o .env), o America/La_Paz. Una zona inválida detiene el arranque. */
    public static ZoneId resolver(String configurada) {
        String zona = configurada == null || configurada.isBlank() ? POR_DEFECTO : configurada.strip();
        try {
            return ZoneId.of(zona);
        } catch (DateTimeException e) {
            throw new IllegalStateException("APP_TIMEZONE no es una zona horaria válida: " + zona, e);
        }
    }

    /** Fija la zona por defecto de la JVM. Debe llamarse antes de abrir conexiones a la base. */
    public static ZoneId aplicar() {
        String configurada = System.getenv("APP_TIMEZONE");
        if (configurada == null) {
            configurada = System.getProperty("APP_TIMEZONE");
        }
        ZoneId zona = resolver(configurada);
        TimeZone.setDefault(TimeZone.getTimeZone(zona));
        return zona;
    }
}
