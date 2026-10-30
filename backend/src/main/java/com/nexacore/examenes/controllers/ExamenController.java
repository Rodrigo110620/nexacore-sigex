package com.nexacore.examenes.controllers;

import org.springframework.security.core.Authentication;
import com.nexacore.examenes.services.SesionExamenService;
import com.nexacore.examenes.dto.SesionExamenResponse;
import com.nexacore.examenes.dto.ReprogramarExamenRequest;
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
    private final SesionExamenService sesionExamenService;

    public ExamenController(ExamenService examenService, SesionExamenService sesionExamenService) {
        this.examenService = examenService;
        this.sesionExamenService = sesionExamenService;
    }

    @Operation(summary = "Listar exámenes", description = "ADMIN y CONTROL ven todos. DOCENTE solo los que tiene asignados.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS', 'REPORTES_VER')")
    @GetMapping
    public ResponseEntity<List<ExamenResponse>> listar() {
        return ResponseEntity.ok(examenService.listar());
    }

    @Operation(summary = "Registrar examen", description = "Crea examen con validación de conflicto de ambiente. ADMIN o DOCENTE; el docente queda asignado a sí mismo.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @PostMapping
    public ResponseEntity<ExamenResponse> crear(@Valid @RequestBody CrearExamenRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examenService.crear(request));
    }

    @Operation(summary = "Actualizar examen", description = "Modifica datos del examen (fecha, hora, ambiente y normas). "
            + "ADMIN cualquiera; DOCENTE solo los suyos, y el examen sigue a su nombre.")
    @PreAuthorize("@examenAccesoService.puedeEditar(#idExamen, authentication)")
    @PutMapping("/{idExamen}/{idParalelo}")
    public ResponseEntity<ExamenResponse> actualizar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idParalelo,
            @Valid @RequestBody ActualizarExamenRequest request) {
        return ResponseEntity.ok(examenService.actualizar(idExamen, idParalelo, request));
    }

    @Operation(summary = "Reprogramar un examen finalizado",
            description = "Para repetirlo en otra fecha: la sesión que terminó queda en el historial con el resultado "
                    + "de cada estudiante y todos vuelven a \"no ingresado\". ADMIN, o el DOCENTE del examen.")
    @PreAuthorize("@examenAccesoService.puedeReprogramar(#idExamen, authentication)")
    @PostMapping("/{idExamen}/{idParalelo}/reprogramar")
    public ResponseEntity<ExamenResponse> reprogramar(@PathVariable Integer idExamen, @PathVariable Integer idParalelo,
                                                      @Valid @RequestBody ReprogramarExamenRequest request,
                                                      Authentication authentication) {
        return ResponseEntity.ok(examenService.reprogramar(idExamen, idParalelo, request, authentication.getName()));
    }

    @Operation(summary = "Historial de sesiones del examen",
            description = "Sesiones anteriores de un examen reprogramado, con el resultado de cada estudiante.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/{idExamen}/{idParalelo}/sesiones")
    public ResponseEntity<List<SesionExamenResponse>> sesiones(@PathVariable Integer idExamen,
                                                              @PathVariable Integer idParalelo) {
        return ResponseEntity.ok(sesionExamenService.listar(idExamen));
    }

    @Operation(summary = "Cancelar examen", description = "Marca el examen como cancelado. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'EXAMENES_CANCELAR')")
    @DeleteMapping("/{idExamen}/{idParalelo}")
    public ResponseEntity<Void> cancelar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idParalelo) {
        examenService.cancelar(idExamen, idParalelo);
        return ResponseEntity.noContent().build();
    }
}
