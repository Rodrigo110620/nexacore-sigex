package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.HistorialOperacionResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.services.HistorialOperacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Tag(name = "Historial de operaciones", description = "Auditoría administrativa completa")
@RestController
@RequestMapping("/admin/historial-operaciones")
@PreAuthorize("hasRole('ADMIN')")
public class HistorialOperacionController {
    private final HistorialOperacionService service;
    public HistorialOperacionController(HistorialOperacionService service) { this.service = service; }

    @Operation(summary = "Consultar el historial con filtros y paginación")
    @GetMapping
    public PageResponse<HistorialOperacionResponse> listar(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size, @RequestParam(required = false) String search,
            @RequestParam(required = false) String modulo, @RequestParam(required = false) String operacion,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return service.listar(page, size, search, modulo, operacion, desde, hasta);
    }

    @Operation(summary = "Exportar el historial filtrado")
    @GetMapping("/exportar.csv")
    public ResponseEntity<byte[]> exportar(@RequestParam(required = false) String search,
            @RequestParam(required = false) String modulo, @RequestParam(required = false) String operacion,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("historial-operaciones.csv").build().toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(service.exportar(search, modulo, operacion, desde, hasta));
    }
}
