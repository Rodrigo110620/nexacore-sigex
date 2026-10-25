package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AutorizarIngresoRequest;
import com.nexacore.examenes.dto.ExpulsarEstudianteRequest;
import com.nexacore.examenes.dto.ExpulsionResponse;
import com.nexacore.examenes.dto.AutorizarIngresoResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoResponse;
import com.nexacore.examenes.dto.RegistroControlIngresoExamenResponse;
import com.nexacore.examenes.dto.ContextoControlIngresoResponse;
import com.nexacore.examenes.dto.TipoIncidenciaResponse;
import com.nexacore.examenes.dto.RegistrarExceptionRequest; 
import com.nexacore.examenes.services.ControlIngresoService;
import com.nexacore.examenes.services.ExcepcionService; 
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Control de ingreso", description = "Registro y autorización del ingreso a exámenes")
@RestController
@RequestMapping("/control-ingresos")
public class ControlIngresoController {
    
    private final ControlIngresoService service;
    private final ExcepcionService excepcionService; 
    public ControlIngresoController(ControlIngresoService service, ExcepcionService excepcionService) {
        this.service = service;
        this.excepcionService = excepcionService; 
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/expulsar")
    public ResponseEntity<ExpulsionResponse> expulsar(
            @Valid @RequestBody ExpulsarEstudianteRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.expulsar(request, authentication));
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

    @Operation(summary = "Consultar registros de ingreso del examen",
            description = "Devuelve las autorizaciones y denegaciones del examen para el informe de ingreso en tiempo real.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/examen/{idExamen}/registros")
    public ResponseEntity<List<RegistroControlIngresoExamenResponse>> registrosExamen(
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.consultarRegistrosExamen(idExamen));
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

    // NUEVO ENDPOINT PARA LA HU#4
    @Operation(summary = "Registrar excepción de no habilitado", 
               description = "Registra en la tabla de excepciones y en el historial de intentos automáticamente.")
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/excepcion-no-habilitado")
    public ResponseEntity<Void> registrarExcepcion(
            @Valid @RequestBody RegistrarExceptionRequest request,
            Authentication authentication) {
        excepcionService.registrarExcepcion(request, authentication.getName());
        return ResponseEntity.ok().build();
    }
}
