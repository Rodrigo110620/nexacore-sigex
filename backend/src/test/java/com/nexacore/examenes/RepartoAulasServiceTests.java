package com.nexacore.examenes;

import com.nexacore.examenes.services.RepartoAulasService;
import com.nexacore.examenes.services.RepartoAulasService.Aula;
import com.nexacore.examenes.services.RepartoAulasService.Candidato;
import com.nexacore.examenes.services.RepartoAulasService.Reparto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class RepartoAulasServiceTests {

    private static final Aula A692 = new Aula(1, "692A", 2, 0);
    private static final Aula A691 = new Aula(2, "691A", 2, 1);

    private static Candidato c(int id, String apellidos, String nombre) {
        return new Candidato(id, apellidos, nombre, false);
    }

    @Test
    void llenaLasAulasEnOrdenAlfabeticoPorApellidosYNombre() {
        Reparto r = RepartoAulasService.calcular(List.of(A692, A691), List.of(
                c(1, "Zapata", "Ana"),
                c(2, "Álvarez", "Luis"),
                c(3, "Pérez", "María"),
                c(4, "Álvarez", "Carla")));

        // Álvarez Carla, Álvarez Luis → 692A; Pérez, Zapata → 691A. La tilde no altera el orden.
        assertThat(r.aulaDe(4)).isEqualTo(A692);
        assertThat(r.aulaDe(2)).isEqualTo(A692);
        assertThat(r.aulaDe(3)).isEqualTo(A691);
        assertThat(r.aulaDe(1)).isEqualTo(A691);
        assertThat(r.asignados()).containsEntry(1, 2).containsEntry(2, 2);
        assertThat(r.sinAula()).isEmpty();
    }

    @Test
    void losQueNoEntranQuedanSinAula() {
        List<Candidato> cinco = IntStream.rangeClosed(1, 5).mapToObj(i -> c(i, "Apellido" + i, "Nombre")).toList();
        Reparto r = RepartoAulasService.calcular(List.of(A692, A691), cinco);

        assertThat(r.sinAula()).containsExactly(5);
        assertThat(r.aulaDe(5)).isNull();
    }

    @Test
    void losNoHabilitadosNoOcupanLugar() {
        Reparto r = RepartoAulasService.calcular(List.of(A692), List.of(
                new Candidato(1, "Arce", "Ana", true),
                c(2, "Bravo", "Beto"),
                c(3, "Cruz", "Carla")));

        assertThat(r.aulaDe(1)).isNull();
        assertThat(r.aulaDe(2)).isEqualTo(A692);
        assertThat(r.aulaDe(3)).isEqualTo(A692);
        assertThat(r.sinAula()).isEmpty();
    }

    @Test
    void unaSolaAulaSinAforoRecibeATodos() {
        Aula sinAforo = new Aula(1, "692A", null, 0);
        List<Candidato> muchos = IntStream.rangeClosed(1, 80).mapToObj(i -> c(i, "A" + i, "N")).toList();

        Reparto r = RepartoAulasService.calcular(List.of(sinAforo), muchos);

        assertThat(r.asignados()).containsEntry(1, 80);
        assertThat(r.sinAula()).isEmpty();
    }

    @Test
    void conVariasAulasUnaSinAforoNoRecibeANadie() {
        Aula sinAforo = new Aula(2, "691A", null, 1);
        Reparto r = RepartoAulasService.calcular(List.of(A692, sinAforo),
                IntStream.rangeClosed(1, 3).mapToObj(i -> c(i, "A" + i, "N")).toList());

        assertThat(r.asignados()).containsEntry(1, 2).containsEntry(2, 0);
        assertThat(r.sinAula()).hasSize(1);
    }

    @Test
    void porLlegadaCadaUnoQuedaEnElAulaDondeIngresoYLosDemasSinAulaTodavia() {
        Reparto r = RepartoAulasService.porLlegada(List.of(A692, A691), List.of(
                new Candidato(1, "Zapata", "Ana", false, 1),
                new Candidato(2, "Álvarez", "Luis", false, 2),
                new Candidato(3, "Pérez", "María", false, null)));

        assertThat(r.porLlegada()).isTrue();
        assertThat(r.aulaDe(1)).isEqualTo(A692);
        assertThat(r.aulaDe(2)).isEqualTo(A691);
        assertThat(r.aulaDe(3)).isNull();
        assertThat(r.asignados()).containsEntry(1, 1).containsEntry(2, 1);
        assertThat(r.sinAula()).isEmpty();
    }

    @Test
    void porLlegadaSeLlenaLaPrimeraAulaAntesDeUsarLaSiguiente() {
        Reparto vacio = RepartoAulasService.porLlegada(List.of(A692, A691), List.of());
        assertThat(RepartoAulasService.aulaParaLlegada(vacio)).isEqualTo(A692);

        Reparto primeraLlena = RepartoAulasService.porLlegada(List.of(A692, A691), List.of(
                new Candidato(1, "A", "A", false, 1), new Candidato(2, "B", "B", false, 1)));
        assertThat(RepartoAulasService.aulaParaLlegada(primeraLlena)).isEqualTo(A691);

        Reparto todasLlenas = RepartoAulasService.porLlegada(List.of(A692, A691), List.of(
                new Candidato(1, "A", "A", false, 1), new Candidato(2, "B", "B", false, 1),
                new Candidato(3, "C", "C", false, 2), new Candidato(4, "D", "D", false, 2)));
        assertThat(RepartoAulasService.aulaParaLlegada(todasLlenas)).isNull();
    }
}
