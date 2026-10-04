package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.EstudianteAsignadoResponse;
import com.nexacore.examenes.dto.IdentificacionResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.ResumenEstudiantesResponse;
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
 * Estudiantes de un examen en el control de ingreso (HU ACCS-01); 404 si el examen no existe.
 *
 *   GET /api/v1/examenes/{idExamen}/estudiantes?estado=TODOS|HABILITADOS|NO_HABILITADOS&page=0&size=10
 *   GET /api/v1/examenes/{idExamen}/estudiantes/resumen
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

    @Operation(summary = "Listar estudiantes del examen",
            description = "Asignados al examen, paginados por apellidos y nombre. ADMIN, CONTROL o su DOCENTE.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping
    public ResponseEntity<PageResponse<EstudianteAsignadoResponse>> listar(
            @PathVariable Integer idExamen,
            @Parameter(description = "TODOS, HABILITADOS o NO_HABILITADOS")
            @RequestParam(defaultValue = "TODOS") String estado,
            @Parameter(description = "Número de página, empezando en 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Estudiantes por página (1 a 100)")
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(identificacionService.listarAsignados(idExamen, estado, page, size));
    }

    @Operation(summary = "Resumen de estudiantes del examen",
            description = "Total de asignados, habilitados, no habilitados e ingresados. ADMIN, CONTROL o su DOCENTE.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/resumen")
    public ResponseEntity<ResumenEstudiantesResponse> resumen(@PathVariable Integer idExamen) {
        return ResponseEntity.ok(identificacionService.resumir(idExamen));
    }

    /**
     * tipo y valor no se marcan como required: los valida el service, así un
     * parámetro faltante responde 400 con el mismo ErrorResponse que uno vacío.
     */
    @Operation(summary = "Identificar estudiante",
            description = "Busca al estudiante por código universitario o CI y devuelve sus datos y su estado "
                    + "en el examen: HABILITADO, DESHABILITADO o NO_VINCULADO. ADMIN, CONTROL o su DOCENTE.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
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
