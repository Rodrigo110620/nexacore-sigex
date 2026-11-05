package com.nexacore.examenes.controllers;

import com.nexacore.examenes.utils.TextoBusqueda;
import com.nexacore.examenes.dto.MateriaResponse;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.services.DocenteMateriaService;
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
    private final DocenteMateriaService docenteMateriaService;

    public MateriaController(MateriaRepository materiaRepository, DocenteMateriaService docenteMateriaService) {
        this.materiaRepository = materiaRepository;
        this.docenteMateriaService = docenteMateriaService;
    }

    @Operation(summary = "Buscar asignaturas", description = "Búsqueda predictiva por nombre o sigla. Mínimo 3 caracteres. ADMIN o DOCENTE.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
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
        // IMP-12: el docente solo ve sus materias.
        Integer idDocente = docenteMateriaService.docenteDeLaSesion();
        java.util.Set<Integer> suyas = idDocente == null ? null
                : docenteMateriaService.materiasDe(idDocente).stream().map(MateriaResponse::id).collect(java.util.stream.Collectors.toSet());
        List<MateriaResponse> resultado = materiaRepository.buscar(TextoBusqueda.sinTildes(q)).stream()
                .filter(m -> suyas == null || suyas.contains(m.getId()))
                .limit(8)
                .map(m -> new MateriaResponse(m.getId(), m.getSigla(), m.getNombre()))
                .toList();
        return ResponseEntity.ok(resultado);
    }

    @Operation(summary = "Mis materias", description = "IMP-12: las materias asignadas al docente autenticado.")
    @PreAuthorize("@permisos.tiene(authentication, 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/mias")
    public List<MateriaResponse> mias() {
        Integer idDocente = docenteMateriaService.docenteDeLaSesion();
        return idDocente == null ? List.of() : docenteMateriaService.materiasDe(idDocente);
    }
}
