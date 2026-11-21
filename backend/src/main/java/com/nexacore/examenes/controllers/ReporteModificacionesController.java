package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ReporteModificacionInhabilitadoResponse;
import com.nexacore.examenes.services.ExamenAccesoService;
import com.nexacore.examenes.services.ReporteModificacionesService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@Tag(name = "Reportes", description = "Modificaciones a listas de inhabilitados")
@RestController
public class ReporteModificacionesController {

    private final ReporteModificacionesService service;
    private final ExamenAccesoService acceso;

    public ReporteModificacionesController(ReporteModificacionesService service, ExamenAccesoService acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_PROPIOS')")
    @GetMapping("/reportes/modificaciones-inhabilitados")
    public List<ReporteModificacionInhabilitadoResponse> listar(
            @RequestParam(required = false) Integer idExamen,
            Authentication authentication) {
        
        Integer soloDe = acceso.veTodosLosReportes(authentication) ? null
                : Objects.requireNonNullElse(acceso.idUsuario(authentication), -1);
                
        return service.listar(idExamen, soloDe);
    }
}