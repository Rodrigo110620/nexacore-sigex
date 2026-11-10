package com.nexacore.examenes.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.HistorialOperacionResponse.Diferencia;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** El historial se lee en español y con nombres: no ids ni JSON. */
class HistorialPresentacionTests {

    private final ObjectMapper json = new ObjectMapper();

    @SuppressWarnings("unchecked")
    private HistorialPresentacion presentacion() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(contains("JOIN materia"), any(RowMapper.class), any(Object[].class))).thenReturn(List.of("Base de Datos I · G2"));
        when(jdbc.query(contains("duracion_minutos"), any(RowMapper.class), any(Object[].class))).thenReturn(List.of(List.of(
                new com.nexacore.examenes.dto.HistorialOperacionResponse.Dato("Horario", "06:45 – 08:15 (90 min)"),
                new com.nexacore.examenes.dto.HistorialOperacionResponse.Dato("Docente", "Juan Pérez Quiroga"))));
        when(jdbc.queryForList(contains("FROM ambiente"), eq(String.class), eq(3))).thenReturn(List.of("607"));
        when(jdbc.queryForList(contains("FROM ambiente"), eq(String.class), eq(4))).thenReturn(List.of("692A"));
        when(jdbc.queryForList(contains("FROM estudiante"), eq(String.class), eq(6))).thenReturn(List.of("Ana Pérez"));
        return new HistorialPresentacion(jdbc);
    }

    private JsonNode leer(String texto) throws Exception {
        return json.readTree(texto);
    }

    @Test
    void reprogramarMuestraSoloLoQueCambioConNombresYElMotivo() throws Exception {
        var vista = presentacion().vista("EXAMEN_REPROGRAMADO", leer("""
                {"idExamen":2,"motivo":"Fecha cambiada",
                 "antes":{"fecha":"2026-11-07","horaInicio":"21:21:00","idAmbiente":3,"duracionMinutos":90,"normas":"Carnet"},
                 "despues":{"fecha":"2026-11-11","horaInicio":"06:45","idAmbiente":4,"duracionMinutos":90,"normas":"Carnet"}}
                """));
        assertThat(vista.objetivo()).isEqualTo("Base de Datos I · G2");
        assertThat(vista.resumen()).isEqualTo("Reprogramó el examen para el 11/11/2026 a las 06:45");
        assertThat(vista.motivo()).isEqualTo("Fecha cambiada");
        assertThat(vista.examen()).extracting(com.nexacore.examenes.dto.HistorialOperacionResponse.Dato::valor)
                .containsExactly("06:45 – 08:15 (90 min)", "Juan Pérez Quiroga");
        assertThat(vista.diferencias()).containsExactly(
                new Diferencia("Fecha", "07/11/2026", "11/11/2026"),
                new Diferencia("Hora", "21:21", "06:45"),
                new Diferencia("Aula", "607", "692A"));
    }

    @Test
    void habilitacionDiceAQuienYConQueMotivo() throws Exception {
        var vista = presentacion().vista("HABILITACION_ACTUALIZADA", leer("""
                {"idExamen":1,"idParalelo":1,"estado":"NO_HABILITADO","motivo":"No pagó la matrícula",
                 "estudiantes":[{"idEstudiante":6,"estadoAnterior":"PENDIENTE"}]}
                """));
        assertThat(vista.resumen()).isEqualTo("Marcó como no habilitado a Ana Pérez");
        assertThat(vista.motivo()).isEqualTo("No pagó la matrícula");
        assertThat(vista.diferencias()).containsExactly(new Diferencia("Ana Pérez", "Pendiente", "No habilitado"));
    }

    @Test
    void elFiltroComparaSinTildesYUsaElMismoCatalogo() {
        assertThat(HistorialPresentacion.codigo("Exámenes")).isEqualTo("EXAMENES");
        assertThat(HistorialPresentacion.codigo("Habilitación")).isEqualTo("HABILITACION");
        assertThat(HistorialPresentacion.tipoDe("HABILITACION_ACTUALIZADA").operacion()).isEqualTo("Habilitación");
        assertThat(HistorialPresentacion.casoSql(false)).contains("WHEN 'USUARIO_DESBLOQUEADO' THEN 'ACTIVAR'");
    }
}
