package com.nexacore.examenes;

import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Importación masiva con PostgreSQL real: 10 000 estudiantes en un archivo, guardados por bloques.
 * Sin @Transactional: cada bloque se confirma como en producción.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class CargaMasivaEstudiantesTests {

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
    @Autowired ImportacionEstudiantesService importacion;
    @MockitoBean EmailService emailService;

    @Test
    void importaDiezMilEstudiantesPorBloquesEInformaLosDuplicados() {
        Integer idFacultad = jdbc.queryForObject("SELECT id_facultad FROM carrera ORDER BY id_carrera LIMIT 1", Integer.class);
        Integer idCarrera = jdbc.queryForObject("SELECT id_carrera FROM carrera ORDER BY id_carrera LIMIT 1", Integer.class);
        // Ya registrados antes de importar: un estudiante y un usuario del personal.
        jdbc.update("INSERT INTO estudiante (codigo_sis, nombre, apellidos, ci, email) VALUES ('202099991', 'Rosa', 'Vargas', '6543217', 'rosa.vargas@est.umss.edu')");
        String ciDelPersonal = jdbc.queryForObject("SELECT ci FROM usuario ORDER BY id_usuario LIMIT 1", String.class);

        String[] nombres = {"María", "José", "Lucía", "Carlos", "Ana", "Jorge", "Rosa", "Luis", "Elena", "Pedro"};
        String[] apellidos = {"González", "Mamani", "Quispe", "Rojas", "Flores", "Vargas", "Gutiérrez", "Choque", "Mendoza", "Torrez"};
        Random azar = new Random(7);
        Set<String> usados = new HashSet<>();
        StringBuilder csv = new StringBuilder("codigoSis,nombre,apellidos,ci,email,idFacultad,idCarrera\n");
        int filas = 0;
        while (filas < 10_000) {
            String sis = "2021" + (10000 + azar.nextInt(89999));
            String ci = String.valueOf(3000000 + azar.nextInt(6999999));
            if (sis.contains(ci) || !usados.add(sis) || !usados.add(ci)) continue;
            // Fila 102: SIS de un estudiante ya registrado. Fila 202: CI de un usuario del personal.
            if (filas == 100) sis = "202099991";
            if (filas == 200) ci = ciDelPersonal;
            csv.append(sis).append(',').append(nombres[azar.nextInt(10)]).append(',')
                .append(apellidos[azar.nextInt(10)]).append(' ').append(apellidos[azar.nextInt(10)]).append(',')
                .append(ci).append(',').append(sis).append("@est.umss.edu,")
                .append(idFacultad).append(',').append(idCarrera).append('\n');
            filas++;
        }
        byte[] archivo = csv.toString().getBytes(StandardCharsets.UTF_8);

        long inicio = System.nanoTime();
        var resultado = importacion.importar(new MockMultipartFile("file", "estudiantes.csv", "text/csv", archivo));
        long segundos = (System.nanoTime() - inicio) / 1_000_000_000;

        assertThat(resultado.errores()).containsExactly(
                "Fila 102: Ya existe un estudiante con ese código SIS.",
                "Fila 202: Ya existe un usuario del sistema con ese CI.");
        assertThat(resultado.insertados()).isEqualTo(9_998);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM estudiante", Integer.class)).isEqualTo(9_999);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM estudiante_carrera", Integer.class)).isEqualTo(9_998);
        // Fila por fila tardaba unos 105 s; por bloques debe quedar muy por debajo del minuto.
        assertThat(segundos).as("segundos para importar 10 000 estudiantes").isLessThan(60);
        System.out.println("Importación de 10 000 estudiantes: " + segundos + " s, " + archivo.length / 1024 + " KB");
    }
}
