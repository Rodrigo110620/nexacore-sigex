package com.nexacore.examenes.controllers;

import com.nexacore.examenes.models.Facultad;
import com.nexacore.examenes.repositories.FacultadRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Facultades", description = "Catálogo de facultades")
@RestController
@RequestMapping("/facultades")
public class FacultadController {

    private final FacultadRepository facultadRepository;

    public FacultadController(FacultadRepository facultadRepository) {
        this.facultadRepository = facultadRepository;
    }

    @Operation(summary = "Listar facultades",
        description = "Devuelve todas las facultades ordenadas por nombre. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<Facultad>> listar() {
        return ResponseEntity.ok(facultadRepository.findAllByOrderByNombreAsc());
    }
}