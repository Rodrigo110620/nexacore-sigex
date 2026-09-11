package com.nexacore.examenes;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/**
 * Verifica que el contexto de Spring Boot levanta correctamente.
 * Usa una base de datos H2 en memoria para no depender de PostgreSQL en CI.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.security.jwt.secret=test_secret_key_muy_larga_para_que_pase_la_validacion_de_longitud_minima",
})
class ExamenesApplicationTests {

    @Test
    void contextLoads() {
    }
}
