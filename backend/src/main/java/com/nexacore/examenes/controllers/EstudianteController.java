package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CarreraResponse;
import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.services.EstudianteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Estudiantes", description = "Gestión de estudiantes")
@RestController
@RequestMapping("/estudiantes")
public class EstudianteController {

    private final EstudianteService estudianteService;

    public EstudianteController(EstudianteService estudianteService) {
        this.estudianteService = estudianteService;
    }

    @Operation(summary = "Listar estudiantes",
        description = "Devuelve los estudiantes paginados con búsqueda y filtros. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<PageResponse<EstudianteListResponse>> listar(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Integer idFacultad,
        @RequestParam(required = false) Integer idCarrera
    ) {
        return ResponseEntity.ok(
            estudianteService.listar(page, size, search, idFacultad, idCarrera)
        );
    }

    @Operation(summary = "Listar carreras",
        description = "Devuelve las carreras, opcionalmente filtradas por facultad.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/carreras")
    public ResponseEntity<List<CarreraResponse>> listarCarreras(
        @RequestParam(required = false) Integer idFacultad
    ) {
        return ResponseEntity.ok(estudianteService.listarCarreras(idFacultad));
    }
}