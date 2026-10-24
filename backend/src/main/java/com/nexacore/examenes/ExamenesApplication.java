package com.nexacore.examenes;

import com.nexacore.examenes.utils.DotEnvLoader;
import com.nexacore.examenes.utils.ZonaHoraria;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Sin el usuario "user" con contraseña aleatoria que Spring Boot crea por defecto: SIGEX se
// autentica solo con JWT (JwtAuthFilter), así que ese usuario no se usaba.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ExamenesApplication {
    public static void main(String[] args) {
        DotEnvLoader.load();
        // Antes de arrancar Spring: así la conexión a PostgreSQL también usa la hora de Bolivia.
        ZonaHoraria.aplicar();
        SpringApplication.run(ExamenesApplication.class, args);
    }
}
