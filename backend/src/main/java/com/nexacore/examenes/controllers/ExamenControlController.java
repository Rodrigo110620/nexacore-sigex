package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AsignarPersonalControlRequest;
import com.nexacore.examenes.dto.PersonalControlResponse;
import com.nexacore.examenes.services.ExamenControlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Personal de control", description = "Quién controla el ingreso de cada examen")
@RestController
public class ExamenControlController {

    private final ExamenControlService service;

    public ExamenControlController(ExamenControlService service) {
        this.service = service;
    }

    @Operation(summary = "Personal de control del examen", description = "Lo ve quien ve el examen: ADMIN, CONTROL y su docente.")
    @PreAuthorize("@examenAccesoService.puedeVer(#idExamen, authentication)")
    @GetMapping("/examenes/{idExamen}/personal-control")
    public List<PersonalControlResponse> delExamen(@PathVariable Integer idExamen) {
        return service.delExamen(idExamen);
    }

    @Operation(summary = "Asignar el personal de control", description = "ADMIN en cualquier examen; el docente en los suyos.")
    @PreAuthorize("@examenAccesoService.puedeReprogramar(#idExamen, authentication)")
    @PutMapping("/examenes/{idExamen}/personal-control")
    public List<PersonalControlResponse> asignar(@PathVariable Integer idExamen, @Valid @RequestBody AsignarPersonalControlRequest request) {
        return service.asignar(idExamen, request.idUsuarios());
    }

    @Operation(summary = "Personal de control disponible", description = "Usuarios activos con el rol CONTROL, para asignarlos.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/personal-control")
    public List<PersonalControlResponse> disponibles() {
        return service.disponibles();
    }
}
