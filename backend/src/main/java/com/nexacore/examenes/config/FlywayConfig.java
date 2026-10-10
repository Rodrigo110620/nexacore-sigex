package com.nexacore.examenes.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Se quitaron de V1, V7, V9, V10 y V11 el schema "NexaCore" (no se usaba) y los
 * "OWNER TO postgres", para que las migraciones corran con cualquier usuario
 * (p. ej. el del PostgreSQL del laboratorio). repair() actualiza los checksums
 * en las bases donde ya estaban aplicadas, sin tocar datos.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repararAntesDeMigrar() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
