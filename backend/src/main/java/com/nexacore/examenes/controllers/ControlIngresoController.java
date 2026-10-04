package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.dto.AutorizarIngresoResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoResponse;
import com.nexacore.examenes.dto.HistorialControlExamenResponse;
import com.nexacore.examenes.dto.ContextoControlIngresoResponse;
import com.nexacore.examenes.dto.TipoIncidenciaResponse;
import com.nexacore.examenes.services.ControlIngresoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@Tag(name = "Control de ingreso", description = "Registro y autorización del ingreso a exámenes")
@RestController
@RequestMapping("/control-ingresos")
public class ControlIngresoController {
    private final ControlIngresoService service;

    public ControlIngresoController(ControlIngresoService service) {
        this.service = service;
    }

    @Operation(summary = "Autorizar ingreso", description = "Registra evidencia y autoriza una sola vez con timestamp del servidor.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/autorizar")
    public ResponseEntity<AutorizarIngresoResponse> autorizar(
            @Valid @RequestBody AutorizarIngresoRequest request,
            Authentication authentication) {
        AutorizarIngresoResponse response = service.autorizar(request, authentication.getName());
        if (response.autorizado()) return ResponseEntity.ok(response);
        if ("DENEGADO_DUPLICADO".equals(response.resultado())) {
            return ResponseEntity.status(409).body(response);
        }
        return ResponseEntity.unprocessableEntity().body(response);
    }

    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/denegar")
    public ResponseEntity<AutorizarIngresoResponse> denegar(
            @Valid @RequestBody AutorizarIngresoRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.denegar(request, authentication.getName()));
    }

    @Operation(summary = "Consultar historial", description = "Devuelve autorizaciones y denegaciones registradas para el estudiante y examen.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/{idEstudiante}/{idExamen}")
    public ResponseEntity<List<RegistroControlIngresoResponse>> historial(
            @PathVariable Integer idEstudiante,
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarHistorial(idEstudiante, idExamen));
    }

    @Operation(summary = "Consultar historial del examen", description = "Devuelve autorizaciones, denegaciones e intentos registrados en un único historial.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/examen/{idExamen}/historial")
    public ResponseEntity<List<HistorialControlExamenResponse>> historialExamen(@PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarHistorialExamen(idExamen));
    }

    @Operation(summary = "Consultar contexto", description = "Devuelve estudiante, examen, normas y condiciones previas para el flujo de autorización.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/{idEstudiante}/{idExamen}/contexto")
    public ResponseEntity<ContextoControlIngresoResponse> contexto(
            @PathVariable Integer idEstudiante,
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarContexto(idEstudiante, idExamen));
    }

    @Operation(summary = "Listar tipos de incidencia", description = "Devuelve el catálogo disponible para registrar incidencias durante el control.")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROL', 'DOCENTE')")
    @GetMapping("/tipos-incidencia")
    public ResponseEntity<List<TipoIncidenciaResponse>> tiposIncidencia() {
        return ResponseEntity.ok(service.listarTiposIncidencia());
    }
}
