package com.nexacore.examenes;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.time.LocalDateTime;

/** Funciones de PostgreSQL que la app usa y H2 no tiene (se registran en application-test.yml). */
public final class FuncionesH2 {

    private FuncionesH2() {
    }

    /** clock_timestamp(): hora real del momento, no la del inicio de la transacción. */
    public static OffsetDateTime clockTimestamp() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
    /** PostgreSQL timezone(text, timestamptz) devuelve timestamp SIN zona, no como AT TIME ZONE de H2. */
    public static LocalDateTime timezone(String zona, OffsetDateTime instante) {
        return instante.atZoneSameInstant(ZoneId.of(zona)).toLocalDateTime();
    }
}
