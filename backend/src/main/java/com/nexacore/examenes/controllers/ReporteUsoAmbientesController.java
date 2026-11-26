package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ReporteUsoAmbienteResponse;
import com.nexacore.examenes.services.ExamenAccesoService;
import com.nexacore.examenes.services.ReporteUsoAmbientesService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Reportes", description = "Uso y reserva de aulas/laboratorios")
@RestController
public class ReporteUsoAmbientesController {

    private final ReporteUsoAmbientesService service;
    private final ExamenAccesoService acceso;

    public ReporteUsoAmbientesController(ReporteUsoAmbientesService service, ExamenAccesoService acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    /** Solo el ADMIN (REPORTES_VER): sirve para planificar la reserva de aulas; el docente ve lo suyo en el detalle del examen. */
    @PreAuthorize("@permisos.tiene(authentication, 'REPORTES_VER')")
    @GetMapping("/reportes/uso-ambientes")
    public List<ReporteUsoAmbienteResponse> listar(
            @RequestParam(required = false) Integer idExamen,
            Authentication authentication) {
        return service.listar(idExamen, null);
    }
}