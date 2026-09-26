package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.services.ExamenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @Operation(summary = "Listar exámenes", description = "Lista exámenes ordenados por fecha. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE','CONTROL')")
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

    @Operation(summary = "Actualizar examen", description = "Modifica datos del examen (fecha, hora, ambiente y normas). Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{idExamen}/{idParalelo}")
    public ResponseEntity<ExamenResponse> actualizar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idParalelo,
            @Valid @RequestBody ActualizarExamenRequest request) {
        return ResponseEntity.ok(examenService.actualizar(idExamen, idParalelo, request));
    }

    @Operation(summary = "Cancelar examen", description = "Marca el examen como cancelado. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{idExamen}/{idParalelo}")
    public ResponseEntity<Void> cancelar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idParalelo) {
        examenService.cancelar(idExamen, idParalelo);
        return ResponseEntity.noContent().build();
    }
}
