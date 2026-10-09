package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.MateriaResponse;
import com.nexacore.examenes.repositories.MateriaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Materias", description = "Catálogo institucional de asignaturas")
@RestController
@RequestMapping("/materias")
public class MateriaController {

    private final MateriaRepository materiaRepository;

    public MateriaController(MateriaRepository materiaRepository) {
        this.materiaRepository = materiaRepository;
    }

    @Operation(summary = "Buscar asignaturas", description = "Búsqueda predictiva por nombre o sigla. Mínimo 3 caracteres. ADMIN o DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    @GetMapping
    public ResponseEntity<List<MateriaResponse>> buscar(
            @RequestParam(name = "search", defaultValue = "") String search) {
        String q = search == null ? "" : search.trim()
                .replace("\\", "")
                .replace("%", "")
                .replace("_", "");
        if (q.length() < 3) {
            return ResponseEntity.ok(List.of());
        }
        List<MateriaResponse> resultado = materiaRepository.buscar(q).stream()
                .limit(8)
                .map(m -> new MateriaResponse(m.getId(), m.getSigla(), m.getNombre()))
                .toList();
        return ResponseEntity.ok(resultado);
    }
}
