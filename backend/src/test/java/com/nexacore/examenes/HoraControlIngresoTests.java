package com.nexacore.examenes;

import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.jpa.repository.Query;
import java.sql.DriverManager;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import static org.assertj.core.api.Assertions.assertThat;

class HoraControlIngresoTests {
    @ParameterizedTest
    @ValueSource(strings = {"UTC", "America/La_Paz", "America/Lima"})
    void horaDelControlEsBolivianaAunqueLaSesionDeBaseUseOtraZona(String zona) throws Exception {
        try (var conexion = DriverManager.getConnection("jdbc:h2:mem:hora_control;MODE=PostgreSQL", "sa", "");
             var sentencia = conexion.createStatement()) {
            sentencia.execute("CREATE ALIAS IF NOT EXISTS CLOCK_TIMESTAMP FOR 'com.nexacore.examenes.FuncionesH2.clockTimestamp'");
            sentencia.execute("CREATE ALIAS IF NOT EXISTS TIMEZONE FOR 'com.nexacore.examenes.FuncionesH2.timezone'");
            sentencia.execute("SET TIME ZONE '" + zona + "'");
            sentencia.execute("CREATE TABLE asistencia_examen (id_estudiante int, id_examen int, fecha_hora_ingreso timestamp, id_ambiente_ingreso int, id_usuario_control int, observaciones_control varchar)");
            sentencia.execute("INSERT INTO asistencia_examen (id_estudiante, id_examen) VALUES (10, 20)");
            String actualizar = AsistenciaExamenRepository.class.getMethod("autorizarConFechaServidor",
                    Integer.class, Integer.class, Integer.class, Integer.class, String.class).getAnnotation(Query.class).value()
                    .replace(":idEstudiante", "10").replace(":idExamen", "20").replace(":idAmbiente", "5")
                    .replace(":idUsuarioControl", "7").replace(":observaciones", "NULL");
            assertThat(sentencia.executeUpdate(actualizar)).isEqualTo(1);
            try (var guardado = sentencia.executeQuery("SELECT fecha_hora_ingreso FROM asistencia_examen")) {
                assertThat(guardado.next()).isTrue();
                LocalDateTime fechaIngreso = guardado.getObject(1, LocalDateTime.class);
                assertThat(Math.abs(Duration.between(fechaIngreso, LocalDateTime.now(ZoneId.of("America/La_Paz"))).toMillis())).isLessThan(2000);
            }
            String consulta = AsistenciaExamenRepository.class.getMethod("obtenerFechaHoraServidor").getAnnotation(Query.class).value();
            try (var resultado = sentencia.executeQuery(consulta)) {
                assertThat(resultado.next()).isTrue();
                LocalDateTime horaControl = resultado.getObject(1, LocalDateTime.class);
                LocalDateTime horaBolivia = LocalDateTime.now(ZoneId.of("America/La_Paz"));
                assertThat(Math.abs(Duration.between(horaControl, horaBolivia).toMillis())).isLessThan(2000);
                var examen = new com.nexacore.examenes.models.Examen();
                var inicio = horaBolivia.minusMinutes(40);
                examen.setFecha(inicio.toLocalDate());
                examen.setHoraInicio(inicio.toLocalTime());
                examen.setDuracionMinutos(190);
                assertThat(com.nexacore.examenes.utils.EstadoExamen.de(examen, horaControl)).isEqualTo("en_curso");

            }
        }
    }
}
