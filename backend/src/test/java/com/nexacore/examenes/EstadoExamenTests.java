package com.nexacore.examenes;

import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.utils.EstadoExamen;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/** El estado se calcula con la hora del servidor: programado, en curso, finalizado o cancelado. */
class EstadoExamenTests {

    private static Examen examen(String estado) {
        Examen e = new Examen();
        e.setFecha(LocalDate.parse("2026-10-24"));
        e.setHoraInicio(LocalTime.parse("08:00"));
        e.setDuracionMinutos(90);
        e.setEstado(estado);
        return e;
    }

    private static String a(String hora, Examen e) {
        return EstadoExamen.de(e, LocalDateTime.parse("2026-10-24T" + hora));
    }

    @Test
    void cambiaSoloSegunLaHora() {
        Examen e = examen("programado");
        assertThat(a("07:59:59", e)).isEqualTo(EstadoExamen.PROGRAMADO);
        assertThat(a("08:00", e)).isEqualTo(EstadoExamen.EN_CURSO);
        assertThat(a("09:29:59", e)).isEqualTo(EstadoExamen.EN_CURSO);
        assertThat(a("09:30", e)).isEqualTo(EstadoExamen.FINALIZADO);
        assertThat(EstadoExamen.de(e, LocalDateTime.parse("2026-10-25T07:00"))).isEqualTo(EstadoExamen.FINALIZADO);
        assertThat(EstadoExamen.de(e, LocalDateTime.parse("2026-10-23T23:00"))).isEqualTo(EstadoExamen.PROGRAMADO);
    }

    @Test
    void canceladoSiempreEsCancelado() {
        Examen e = examen("CANCELADO");
        assertThat(a("08:30", e)).isEqualTo(EstadoExamen.CANCELADO);
        assertThat(a("10:00", e)).isEqualTo(EstadoExamen.CANCELADO);
    }

    @Test
    void sinEstadoGuardadoSeTomaComoProgramado() {
        assertThat(a("07:00", examen(null))).isEqualTo(EstadoExamen.PROGRAMADO);
        assertThat(EstadoExamen.fin(examen(null))).isEqualTo(LocalDateTime.parse("2026-10-24T09:30"));
    }
}
