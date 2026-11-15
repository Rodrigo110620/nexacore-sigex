package com.nexacore.examenes.services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** BUG-G01 / A05: no inscrito, aula incorrecta y no habilitado se distinguen y se leen sin el texto crudo. */
class MotivoIntentoTests {

    @Test
    void aulaIncorrectaConLasDosAulas() {
        var c = MotivoIntento.de("Ambiente incorrecto: se presentó en el aula 660; aula asignada: 607");
        assertThat(c.tipo()).isEqualTo(MotivoIntento.AULA_INCORRECTA);
        assertThat(c.etiqueta()).isEqualTo("Aula incorrecta (660, debía 607)");
        assertThat(c.detalle()).isNull();
    }

    @Test
    void noHabilitadoSinElTextoCrudo() {
        var c = MotivoIntento.de("Intento ingresar no habilitado ### Motivo: No cumple requisitos previos | "
                + "Acción tomada: Se solicitó al estudiante retirarse del ambiente. | Observaciones: Sin carnet");
        assertThat(c.tipo()).isEqualTo(MotivoIntento.NO_HABILITADO);
        assertThat(c.etiqueta()).isEqualTo("No habilitado: No cumple requisitos previos");
        assertThat(c.detalle()).isEqualTo("Acción tomada: Se solicitó al estudiante retirarse del ambiente. · Observaciones: Sin carnet");
        // Sin motivo (pendiente de habilitación) queda solo «No habilitado».
        assertThat(MotivoIntento.de("Intento ingresar no habilitado ### Acción tomada: Se retiró").etiqueta()).isEqualTo("No habilitado");
    }

    @Test
    void elRestoEsNoInscritoConElTextoDelControl() {
        var c = MotivoIntento.de("Intentó ingresar a un examen que no le corresponde.");
        assertThat(c.tipo()).isEqualTo(MotivoIntento.NO_INSCRITO);
        assertThat(c.etiqueta()).isEqualTo("No inscrito en la materia");
        assertThat(c.detalle()).isEqualTo("Intentó ingresar a un examen que no le corresponde.");
        assertThat(MotivoIntento.de(null).detalle()).isNull();
    }
}
