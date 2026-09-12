package com.nexacore.examenes.utils;

import io.github.cdimascio.dotenv.Dotenv;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Carga el archivo .env de la raíz del monorepo antes de arrancar Spring Boot.
 * Busca hacia arriba desde el directorio de trabajo (backend/ o raíz del proyecto).
 */
public final class DotEnvLoader {

    private DotEnvLoader() {
    }

    public static void load() {
        Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();

        for (int i = 0; i < 4; i++) {
            Path envFile = dir.resolve(".env");
            if (Files.isRegularFile(envFile)) {
                Dotenv dotenv = Dotenv.configure()
                    .directory(dir.toString())
                    .ignoreIfMalformed()
                    .ignoreIfMissing()
                    .load();

                dotenv.entries().forEach(entry -> {
                    String key = entry.getKey();
                    if (System.getenv(key) == null && System.getProperty(key) == null) {
                        System.setProperty(key, entry.getValue());
                    }
                });
                return;
            }

            Path parent = dir.getParent();
            if (parent == null) {
                break;
            }
            dir = parent;
        }
    }
}
