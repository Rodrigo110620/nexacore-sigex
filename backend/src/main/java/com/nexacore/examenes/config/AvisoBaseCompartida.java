package com.nexacore.examenes.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Con DB_TARGET=supabase el backend usa la base compartida del equipo y Flyway le aplica las
 * migraciones nuevas de la rama actual. El aviso queda en el log de arranque para que no pase
 * sin darse cuenta.
 */
@Component
@Profile("supabase")
public class AvisoBaseCompartida {

    private static final Logger log = LoggerFactory.getLogger(AvisoBaseCompartida.class);

    @PostConstruct
    void avisar() {
        log.warn("DB_TARGET=supabase: usando la base COMPARTIDA del equipo. Flyway le aplica las migraciones "
                + "nuevas de esta rama. Para probar migraciones, usa DB_TARGET=docker.");
    }
}
