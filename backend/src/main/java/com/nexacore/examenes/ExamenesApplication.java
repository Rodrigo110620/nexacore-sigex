package com.nexacore.examenes;

import com.nexacore.examenes.utils.DotEnvLoader;
import com.nexacore.examenes.utils.ZonaHoraria;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ExamenesApplication {
    public static void main(String[] args) {
        DotEnvLoader.load();
        // Antes de arrancar Spring: así la conexión a PostgreSQL también usa la hora de Bolivia.
        ZonaHoraria.aplicar();
        SpringApplication.run(ExamenesApplication.class, args);
    }
}
