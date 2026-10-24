package com.nexacore.examenes.utils;

import com.nexacore.examenes.models.Examen;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Estado del examen según la hora del servidor (Bolivia). En la base solo se guardan
 * "programado" y "cancelado"; "en_curso" y "finalizado" se calculan con la fecha, la hora de
 * inicio y la duración, así siempre son exactos sin una tarea que los actualice.
 */
public final class EstadoExamen {

    public static final String PROGRAMADO = "programado";
    public static final String EN_CURSO = "en_curso";
    public static final String FINALIZADO = "finalizado";
    public static final String CANCELADO = "cancelado";

    private EstadoExamen() {
    }

    public static String de(Examen examen, LocalDateTime ahora) {
        String guardado = examen.getEstado() == null ? PROGRAMADO : examen.getEstado().toLowerCase(Locale.ROOT);
        if (CANCELADO.equals(guardado) || FINALIZADO.equals(guardado)) {
            return guardado;
        }
        LocalDateTime inicio = inicio(examen);
        if (inicio == null) {
            return guardado;
        }
        if (!ahora.isBefore(fin(examen))) {
            return FINALIZADO;
        }
        return ahora.isBefore(inicio) ? PROGRAMADO : EN_CURSO;
    }

    public static LocalDateTime inicio(Examen examen) {
        if (examen.getFecha() == null || examen.getHoraInicio() == null) {
            return null;
        }
        return examen.getFecha().atTime(examen.getHoraInicio());
    }

    public static LocalDateTime fin(Examen examen) {
        LocalDateTime inicio = inicio(examen);
        int duracion = examen.getDuracionMinutos() == null ? 0 : examen.getDuracionMinutos();
        return inicio == null ? null : inicio.plusMinutes(duracion);
    }
}
