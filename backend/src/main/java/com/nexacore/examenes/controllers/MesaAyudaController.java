package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AtenderSolicitudAyudaRequest;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.SolicitudAyudaRequest;
import com.nexacore.examenes.dto.SolicitudAyudaResponse;
import com.nexacore.examenes.services.MesaAyudaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Mesa de ayuda", description = "Consultas de los usuarios y su atención por el ADMIN")
@RestController
public class MesaAyudaController {
    private final MesaAyudaService service;

    public MesaAyudaController(MesaAyudaService service) {
        this.service = service;
    }

    @Operation(summary = "Enviar una consulta", description = "Pública (también desde el login, sin sesión). "
            + "Con sesión queda quién la envió. Limitada por IP para evitar abusos.")
    @PostMapping("/ayuda/solicitar")
    public ResponseEntity<Void> solicitar(@Valid @RequestBody SolicitudAyudaRequest request, Authentication authentication) {
        service.crear(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @Operation(summary = "Bandeja de la mesa de ayuda", description = "Consultas, las más recientes primero; "
            + "estado PENDIENTE o ATENDIDA (vacío = todas). Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/admin/mesa-ayuda")
    public PageResponse<SolicitudAyudaResponse> listar(@RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return service.listar(estado, page, size);
    }

    @Operation(summary = "Cuántas consultas están pendientes", description = "Para el contador de la pestaña. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/admin/mesa-ayuda/pendientes")
    public Map<String, Long> pendientes() {
        return Map.of("pendientes", service.pendientes());
    }

    @Operation(summary = "Atender una consulta", description = "La marca como atendida; si se escribe una respuesta, "
            + "se envía por correo a quien consultó. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @PatchMapping("/admin/mesa-ayuda/{id}")
    public SolicitudAyudaResponse atender(@PathVariable Integer id, @Valid @RequestBody AtenderSolicitudAyudaRequest request) {
        return service.atender(id, request.respuesta());
    }
}
