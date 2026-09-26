package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.services.ExamenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Exámenes", description = "Registro y consulta de exámenes")
@RestController
@RequestMapping("/examenes")
public class ExamenController {

    private final ExamenService examenService;

    public ExamenController(ExamenService examenService) {
        this.examenService = examenService;
    }

    @Operation(summary = "Listar exámenes", description = "Lista exámenes ordenados por fecha. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<ExamenResponse>> listar() {
        return ResponseEntity.ok(examenService.listar());
    }

    @Operation(summary = "Registrar examen", description = "Crea examen con validación de conflicto de ambiente. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ExamenResponse> crear(@Valid @RequestBody CrearExamenRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examenService.crear(request));
    }
}
