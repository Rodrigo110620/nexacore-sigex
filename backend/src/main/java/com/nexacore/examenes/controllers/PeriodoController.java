package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CrearPeriodoRequest;
import com.nexacore.examenes.dto.PeriodoAcademicoResponse;
import com.nexacore.examenes.services.PeriodoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Tag(name = "Periodos académicos", description = "Semestres: el activo es el de los grupos y exámenes nuevos")
@RequestMapping("/periodos")
public class PeriodoController {

    private final PeriodoService periodoService;

    public PeriodoController(PeriodoService periodoService) {
        this.periodoService = periodoService;
    }

    @Operation(summary = "Listar periodos", description = "Cualquier usuario del personal: para elegir el periodo en las listas.")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<PeriodoAcademicoResponse>> listar() {
        return ResponseEntity.ok(periodoService.listar());
    }

    @Operation(summary = "Crear periodo", description = "Solo ADMIN. Con activar=true pasa a ser el periodo activo.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<PeriodoAcademicoResponse> crear(@Valid @RequestBody CrearPeriodoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(periodoService.crear(request));
    }

    @Operation(summary = "Activar periodo", description = "Solo ADMIN. Los grupos y exámenes nuevos serán de este periodo.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{idPeriodo}/activar")
    public ResponseEntity<PeriodoAcademicoResponse> activar(@PathVariable Integer idPeriodo) {
        return ResponseEntity.ok(periodoService.activar(idPeriodo));
    }
}
