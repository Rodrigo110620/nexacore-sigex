package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.IntentoIngresoResponse;
import com.nexacore.examenes.dto.RegistrarAmbienteIncorrectoRequest;
import com.nexacore.examenes.dto.RegistrarIntentoIngresoRequest;
import com.nexacore.examenes.services.IntentoIngresoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/intentos-ingreso")
public class IntentoIngresoController {
    private final IntentoIngresoService service;
    public IntentoIngresoController(IntentoIngresoService service) { this.service = service; }

    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping
    public ResponseEntity<Void> registrar(@Valid @RequestBody RegistrarIntentoIngresoRequest request,
                                          Authentication authentication) {
        service.registrar(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** ACCS-06: estudiante del examen que se presentó en un aula distinta de la asignada. */
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/ambiente-incorrecto")
    public ResponseEntity<IntentoIngresoResponse> registrarAmbienteIncorrecto(
            @Valid @RequestBody RegistrarAmbienteIncorrectoRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.registrarAmbienteIncorrecto(request, authentication.getName()));
    }

    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping
    public ResponseEntity<List<IntentoIngresoResponse>> listar(@RequestParam Integer idExamen,
                                                                 @RequestParam(required = false) Integer idEstudiante) {
        return ResponseEntity.ok(service.listar(idExamen, idEstudiante));
    }

    /** DASH-06 / HU#7: reporte de intentos incorrectos de todos los exámenes (o de uno). Solo ADMIN. */
    @PreAuthorize("@permisos.tiene(authentication, 'REPORTES_VER')")
    @GetMapping("/reporte")
    public ResponseEntity<com.nexacore.examenes.dto.PageResponse<com.nexacore.examenes.dto.IntentoReporteResponse>> reporte(
            @RequestParam(required = false) Integer idExamen,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.reporte(idExamen, page, size));
    }
}
