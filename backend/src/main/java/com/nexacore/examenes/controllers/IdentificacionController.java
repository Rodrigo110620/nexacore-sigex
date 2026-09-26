package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.services.IdentificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Identificación del estudiante en el control de ingreso (HU ACCS-01).
 *
 *   GET /api/v1/examenes/{idExamen}/estudiantes/identificar?tipo=codigo|ci&valor=...
 *
 * 200 con el estado HABILITADO, DESHABILITADO o NO_VINCULADO; 404 si el estudiante no existe.
 */
@Tag(name = "Control de ingreso", description = "Identificación de estudiantes en la puerta del examen")
@RestController
@RequestMapping("/examenes/{idExamen}/estudiantes")
public class IdentificacionController {

    private final IdentificacionService identificacionService;

    public IdentificacionController(IdentificacionService identificacionService) {
        this.identificacionService = identificacionService;
    }

    /**
     * tipo y valor no se marcan como required: los valida el service, así un
     * parámetro faltante responde 400 con el mismo ErrorResponse que uno vacío.
     */
    @Operation(summary = "Identificar estudiante",
            description = "Busca al estudiante por código universitario o CI y devuelve sus datos y su estado "
                    + "en el examen: HABILITADO, DESHABILITADO o NO_VINCULADO. Solo CONTROL o ADMIN.")
    @PreAuthorize("hasAnyRole('CONTROL', 'ADMIN')")
    @GetMapping("/identificar")
    public ResponseEntity<IdentificacionResponse> identificar(
            @PathVariable Integer idExamen,
            @Parameter(description = "codigo (código universitario) o ci")
            @RequestParam(required = false) String tipo,
            @Parameter(description = "Código universitario o CI del estudiante")
            @RequestParam(required = false) String valor) {
        return ResponseEntity.ok(identificacionService.identificar(idExamen, tipo, valor));
    }
}
