package com.nexacore.examenes.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Antes se hacía repair() en cada arranque, para actualizar los checksums de V1, V7, V9, V10 y V11
 * cuando se les quitó el schema "NexaCore" y los "OWNER TO postgres" (aea230f). Todas las bases
 * en uso ya arrancaron desde entonces, y el repair automático tenía un costo: aceptaba en silencio
 * cualquier migración editada. Ahora solo se repara si FLYWAY_REPARAR=true.
 */
@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    @Bean
    public FlywayMigrationStrategy migrar(@Value("${app.flyway.reparar-al-iniciar:false}") boolean reparar) {
        return flyway -> {
            if (reparar) {
                log.warn("FLYWAY_REPARAR=true: se alinean los checksums del historial antes de migrar.");
                flyway.repair();
            }
            flyway.migrate();
        };
    }
}
