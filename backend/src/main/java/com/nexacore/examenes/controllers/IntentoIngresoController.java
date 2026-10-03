package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.IntentoIngresoResponse;
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

    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping
    public ResponseEntity<List<IntentoIngresoResponse>> listar(@RequestParam Integer idExamen,
                                                                 @RequestParam(required = false) Integer idEstudiante) {
        return ResponseEntity.ok(service.listar(idExamen, idEstudiante));
    }
}
