package com.nexacore.examenes.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** Hora del servidor, para que los cronómetros no dependan del reloj del celular o la PC. */
@RestController
@RequestMapping("/tiempo")
@Tag(name = "Tiempo", description = "Hora oficial del servidor (Bolivia)")
public class TiempoController {

    /**
     * @param ahora          hora local del servidor (la de los exámenes)
     * @param epochMs        el mismo instante en milisegundos, para corregir el reloj del dispositivo
     * @param offsetMinutos  diferencia con UTC de la zona del servidor (Bolivia: -240)
     */
    public record TiempoResponse(LocalDateTime ahora, long epochMs, String zona, int offsetMinutos) {}

    @Operation(summary = "Hora del servidor", description = "Cualquier usuario con sesión, también el estudiante.")
    @GetMapping
    public ResponseEntity<TiempoResponse> ahora() {
        ZoneId zona = ZoneId.systemDefault();
        Instant instante = Instant.now();
        return ResponseEntity.ok(new TiempoResponse(LocalDateTime.ofInstant(instante, zona), instante.toEpochMilli(),
                zona.getId(), zona.getRules().getOffset(instante).getTotalSeconds() / 60));
    }
}
