package com.nexacore.examenes;

import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.dto.ReprogramarExamenRequest;
import com.nexacore.examenes.repositories.ExamenAulaRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.services.*;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.time.*;
import java.util.List;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
abstract class ExpulsionPostgresBase {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15.10");

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @Autowired ControlIngresoService control;
    @Autowired ExamenService examenes;
    @Autowired SesionExamenService sesiones;
    @Autowired ExpulsionRepository expulsiones;
    @Autowired ExamenAulaRepository aulas;
    @Autowired NotificacionService notificaciones;
    protected TransactionTemplate tx;
    protected int estudiante, examen, paralelo;
    protected String email;
    private static int secuencia;

    @BeforeEach
    void preparar() {
        tx = new TransactionTemplate(manager);
        int n = ++secuencia;
        email = "concurrencia" + n + "@sigex.test";
        int usuario = jdbc.queryForObject("INSERT INTO usuario(nombre,apellidos,ci,email,password,estado) VALUES ('Ana','Prueba',?,?,'x','activo') RETURNING id_usuario",
                Integer.class, "CON" + n, email);
        jdbc.update("INSERT INTO docente(id_usuario,categoria) VALUES (?,'INTERINO')", usuario);
        int materia = jdbc.queryForObject("INSERT INTO materia(sigla,nombre) VALUES (?,'Concurrencia') RETURNING id_materia", Integer.class, "CON" + n);
        paralelo = jdbc.queryForObject("INSERT INTO paralelo(id_materia,id_docente,nombre_grupo) VALUES (?,?,'1') RETURNING id_paralelo", Integer.class, materia, usuario);
        examen = jdbc.queryForObject("INSERT INTO examen(id_paralelo,fecha,hora_inicio,duracion_minutos,id_materia,id_docente,id_ambiente) VALUES (?,CURRENT_DATE-1,'08:00',60,?,?,(SELECT min(id_ambiente) FROM ambiente)) RETURNING id_examen",
                Integer.class, paralelo, materia, usuario);
        estudiante = jdbc.queryForObject("INSERT INTO estudiante(codigo_sis,nombre,apellidos,ci,email) VALUES (?,'Eva','Prueba',?,?) RETURNING id_estudiante",
                Integer.class, String.valueOf(209900000 + n), String.valueOf(7000000 + n), "eva" + n + "@sigex.test");
        jdbc.update("INSERT INTO asistencia_examen(id_estudiante,id_examen,id_paralelo,habilitado,fecha_hora_ingreso) VALUES (?,?,?,true,NOW())", estudiante, examen, paralelo);
    }

    protected UsernamePasswordAuthenticationToken admin(String nombre) {
        return UsernamePasswordAuthenticationToken.authenticated(nombre, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    protected ExpulsarEstudianteRequest request() {
        return new ExpulsarEstudianteRequest(estudiante, examen, "Uso de celular");
    }

    protected void reprogramar() {
        examenes.reprogramar(examen, paralelo, new ReprogramarExamenRequest(LocalDate.now().plusDays(examen + 1),
                LocalTime.of(8, 0), 60, "Repetir por corte de luz"), email);
    }

    protected void ingresoNuevo() {
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_ingreso=clock_timestamp() WHERE id_examen=?", examen);
    }

    protected void esperar(CountDownLatch señal) throws InterruptedException {
        assertTrue(señal.await(8, TimeUnit.SECONDS), "La operación concurrente no avanzó");
    }
}
