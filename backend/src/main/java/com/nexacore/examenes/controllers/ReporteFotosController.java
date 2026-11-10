package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ReporteFotoFilaResponse;
import com.nexacore.examenes.services.ExamenAccesoService;
import com.nexacore.examenes.services.ReporteFotosService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@Tag(name = "Reportes", description = "Fotos reportadas en el control de ingreso")
@RestController
public class ReporteFotosController {

    private final ReporteFotosService service;
    private final ExamenAccesoService acceso;

    public ReporteFotosController(ReporteFotosService service, ExamenAccesoService acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @Operation(summary = "Fotos reportadas",
            description = "Pendientes y resueltas. El ADMIN, de todos los exámenes; el DOCENTE y el CONTROL, de los suyos "
                    + "o asignados. 403 con un examen ajeno.")
    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_PROPIOS')"
            + " and (#idExamen == null or @examenAccesoService.veTodosLosReportes(authentication) or @examenAccesoService.esMio(#idExamen, authentication))")
    @GetMapping("/reportes/fotos")
    public List<ReporteFotoFilaResponse> listar(@RequestParam(required = false) Integer idExamen, Authentication authentication) {
        Integer soloDe = acceso.veTodosLosReportes(authentication) ? null
                : Objects.requireNonNullElse(acceso.idUsuario(authentication), -1);
        return service.listar(idExamen, soloDe);
    }
}
