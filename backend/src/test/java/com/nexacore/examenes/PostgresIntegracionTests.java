package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.EstudianteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Lo que H2 no puede probar: las migraciones de Flyway, el esquema validado por Hibernate, las
 * restricciones y triggers de PostgreSQL y las consultas que H2 no acepta (…IgnoreCase sobre
 * columnas de texto largo). Sin Docker disponible, la clase se omite.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class PostgresIntegracionTests {

    /** La misma versión de docker-compose.dev.yml. */
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15.10");

    @DynamicPropertySource
    static void baseDeDatos(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.locations", () -> "classpath:db/migration");
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired EstudianteService estudianteService;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired AmbienteRepository ambienteRepository;
    @MockBean EmailService emailService;

    @Test
    void flywayAplicaTodasLasMigracionesYHibernateValidaElEsquema() throws IOException {
        // Si el contexto arrancó, Hibernate ya validó el esquema (ddl-auto=validate).
        int ultima = Arrays.stream(new PathMatchingResourcePatternResolver()
                        .getResources("classpath:db/migration/V*__*.sql"))
                .map(Resource::getFilename)
                .filter(Objects::nonNull)
                .map(nombre -> Pattern.compile("^V(\\d+)__").matcher(nombre))
                .filter(Matcher::find)
                .mapToInt(m -> Integer.parseInt(m.group(1)))
                .max().orElseThrow();
        Integer aplicada = jdbc.queryForObject(
                "SELECT max(version::int) FROM flyway_schema_history WHERE success AND version ~ '^[0-9]+$'",
                Integer.class);
        assertThat(aplicada).isEqualTo(ultima);
    }

    @Test
    void lasConsultasIgnoreCaseFuncionanEnPostgres() {
        jdbc.update("""
                INSERT INTO estudiante (codigo_sis, nombre, apellidos, ci, email)
                VALUES ('202104010', 'Ana', 'Rojas', '7489210', 'ana.rojas@est.umss.edu')
                """);
        assertThat(estudianteRepository.existsByEmailIgnoreCase("ANA.ROJAS@est.umss.edu")).isTrue();
        assertThat(estudianteRepository.existsByCodigoSisIgnoreCase("202104010")).isTrue();
        assertThat(estudianteRepository.existsByCiIgnoreCase("7489210")).isTrue();
        assertThat(usuarioRepository.existsByEmailIgnoreCase("NO.EXISTE@umss.edu")).isFalse();
        assertThat(usuarioRepository.existsByCiIgnoreCase("0000000")).isFalse();
        assertThat(ambienteRepository.existsByNombreIgnoreCase("aula que no existe")).isFalse();
    }

    @Test
    void elTelefonoSigueLaMismaReglaEnLaApiYEnLaBase() {
        Integer idFacultad = jdbc.queryForObject("SELECT id_facultad FROM carrera ORDER BY id_carrera LIMIT 1", Integer.class);
        Integer idCarrera = jdbc.queryForObject("SELECT id_carrera FROM carrera ORDER BY id_carrera LIMIT 1", Integer.class);
        var registrado = estudianteService.registrar(new RegistrarEstudianteRequest(
                "María", "González", "7489299", "22345678", "maria.gonzalez@est.umss.edu", "202104099",
                idFacultad, idCarrera, null, null));
        assertThat(registrado.telefono()).isEqualTo("22345678");

        // Solo queda la restricción de la V32 (la V33 quita la de la V30 que existió un tiempo).
        assertThat(jdbc.queryForList("""
                SELECT conname FROM pg_constraint
                WHERE conrelid = 'estudiante'::regclass AND conname LIKE '%telefono%'
                """, String.class)).containsExactly("chk_estudiante_telefono");
        assertThatThrownBy(() -> jdbc.update(
                "UPDATE estudiante SET telefono = '51234567' WHERE codigo_sis = '202104099'"))
                .hasMessageContaining("chk_estudiante_telefono");
    }

    @Test
    void laCuentaDeUnEstudianteSoloPuedeTenerElRolEstudiante() {
        jdbc.update("""
                INSERT INTO usuario (nombre, apellidos, ci, email, password, estado)
                VALUES ('Ana', 'Rojas', '7489210', 'ana.rojas@est.umss.edu', 'x', 'activo')
                """);
        Integer idUsuario = jdbc.queryForObject(
                "SELECT id_usuario FROM usuario WHERE email = 'ana.rojas@est.umss.edu'", Integer.class);
        jdbc.update("""
                INSERT INTO estudiante (codigo_sis, nombre, apellidos, ci, email, id_usuario)
                VALUES ('202104010', 'Ana', 'Rojas', '7489210', 'ana.rojas@est.umss.edu', ?)
                """, idUsuario);

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO usuario_rol (id_usuario, id_rol)
                SELECT ?, id_rol FROM rol WHERE nombre = 'ADMIN'
                """, idUsuario))
                .hasMessageContaining("solo puede tener el rol ESTUDIANTE");
    }
}
