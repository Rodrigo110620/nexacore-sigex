package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ActualizarHabilitacionRequest;
import com.nexacore.examenes.dto.AsociacionLoteResponse;
import com.nexacore.examenes.dto.AsociarEstudiantesLoteRequest;
import com.nexacore.examenes.dto.AsociarEstudianteRequest;
import com.nexacore.examenes.dto.EstudianteHabilitacionResponse;
import com.nexacore.examenes.services.HabilitacionService;
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

/**
 * Estudiantes habilitados de un examen; 404 si el examen no existe.
 *
 *   GET  /api/v1/examenes/{idExamen}/{idParalelo}/habilitacion
 *   POST /api/v1/examenes/{idExamen}/{idParalelo}/habilitacion   { identificador }
 *   POST /api/v1/examenes/{idExamen}/{idParalelo}/habilitacion/lote   { identificadores }
 *   POST /api/v1/examenes/{idExamen}/{idParalelo}/habilitacion/inscritos
 *   PUT  /api/v1/examenes/{idExamen}/{idParalelo}/habilitacion   { idsEstudiante, estadoHabilitacion, motivo }
 *
 * Asociar también inscribe al estudiante en el paralelo del examen si no lo estaba.
 * POST y PUT devuelven el listado actualizado; lote e inscritos lo envuelven con un resumen.
 */
@Tag(name = "Habilitación", description = "Estudiantes asociados y habilitados para un examen")
@RestController
@RequestMapping("/examenes/{idExamen}/{idParalelo}/habilitacion")
public class HabilitacionController {

    private final HabilitacionService habilitacionService;

    public HabilitacionController(HabilitacionService habilitacionService) {
        this.habilitacionService = habilitacionService;
    }

    @Operation(summary = "Listar estudiantes del examen con su habilitación")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE','CONTROL')")
    @GetMapping
    public ResponseEntity<List<EstudianteHabilitacionResponse>> listar(
            @PathVariable Integer idExamen, @PathVariable Integer idParalelo) {
        return ResponseEntity.ok(habilitacionService.listar(idExamen, idParalelo));
    }

    @Operation(summary = "Asociar estudiante al examen",
            description = "Busca por código universitario o CI y lo asocia habilitado. 409 si ya está asociado.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<List<EstudianteHabilitacionResponse>> asociar(
            @PathVariable Integer idExamen, @PathVariable Integer idParalelo,
            @Valid @RequestBody AsociarEstudianteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(habilitacionService.asociar(idExamen, idParalelo, request.identificador()));
    }

    @Operation(summary = "Asociar varios estudiantes al examen",
            description = "Por códigos universitarios o CI. Los ya asociados o inexistentes se informan sin detener al resto.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/lote")
    public ResponseEntity<AsociacionLoteResponse> asociarLote(
            @PathVariable Integer idExamen, @PathVariable Integer idParalelo,
            @Valid @RequestBody AsociarEstudiantesLoteRequest request) {
        return ResponseEntity.ok(habilitacionService.asociarLote(idExamen, idParalelo, request.identificadores()));
    }

    @Operation(summary = "Asociar a todos los inscritos del paralelo",
            description = "Asocia, habilitados, a los inscritos en el paralelo del examen que aún no estén asociados.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/inscritos")
    public ResponseEntity<AsociacionLoteResponse> asociarInscritos(
            @PathVariable Integer idExamen, @PathVariable Integer idParalelo) {
        return ResponseEntity.ok(habilitacionService.asociarInscritos(idExamen, idParalelo));
    }

    @Operation(summary = "Cambiar habilitación",
            description = "Habilita o deshabilita uno o varios estudiantes asociados al examen.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping
    public ResponseEntity<List<EstudianteHabilitacionResponse>> actualizar(
            @PathVariable Integer idExamen, @PathVariable Integer idParalelo,
            @Valid @RequestBody ActualizarHabilitacionRequest request) {
        return ResponseEntity.ok(habilitacionService.actualizar(idExamen, idParalelo, request));
    }
}
