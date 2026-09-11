package com.nexacore.examenes;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Verifica que el contexto de Spring Boot levanta correctamente.
 * Usa el perfil {@code test} (H2 en memoria) para no depender de PostgreSQL en CI.
 */
@SpringBootTest
@ActiveProfiles("test")
class ExamenesApplicationTests {

    @Test
    void contextLoads() {
    }
}
