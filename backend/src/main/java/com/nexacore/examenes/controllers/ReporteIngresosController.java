package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ReporteIngresoResponse;
import com.nexacore.examenes.services.ExamenAccesoService;
import com.nexacore.examenes.services.ReporteIngresosService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Objects;

@Tag(name = "Reportes", description = "Ingresos QR y Manual")
@RestController
public class ReporteIngresosController {
    private final ReporteIngresosService service;
    private final ExamenAccesoService acceso;

    public ReporteIngresosController(ReporteIngresosService service, ExamenAccesoService acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_PROPIOS')")
    @GetMapping("/reportes/ingresos")
    public List<ReporteIngresoResponse> listar(
            @RequestParam(required = false) Integer idExamen,
            Authentication authentication) {
        Integer soloDe = acceso.veTodosLosReportes(authentication) ? null
                : Objects.requireNonNullElse(acceso.idUsuario(authentication), -1);
        return service.listar(idExamen, soloDe);
    }
}