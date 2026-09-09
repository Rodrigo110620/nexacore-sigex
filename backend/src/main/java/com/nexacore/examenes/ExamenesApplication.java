package com.nexacore.examenes;

import com.nexacore.examenes.utils.DotEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ExamenesApplication {
    public static void main(String[] args) {
        DotEnvLoader.load();
        SpringApplication.run(ExamenesApplication.class, args);
    }
}
