package com.nexacore.examenes.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@Tag(name = "Health", description = "Verificación de estado del servidor")
@RestController
@RequestMapping("/health")
public class HealthController {

    @Operation(summary = "Ping al servidor", description = "Retorna OK con la hora del servidor. Endpoint público.")
    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "application", "SIGEX — NexaCore",
            "timestamp", Instant.now().toString()
        ));
    }
}
