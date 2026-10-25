package com.nexacore.examenes;

import java.sql.Timestamp;

/** Funciones de PostgreSQL que la app usa y H2 no tiene (se registran en application-test.yml). */
public final class FuncionesH2 {

    private FuncionesH2() {
    }

    /** clock_timestamp(): hora real del momento, no la del inicio de la transacción. */
    public static Timestamp clockTimestamp() {
        return new Timestamp(System.currentTimeMillis());
    }
}
