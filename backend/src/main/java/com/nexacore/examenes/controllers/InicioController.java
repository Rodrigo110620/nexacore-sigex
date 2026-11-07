package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.InicioAdminResponse;
import com.nexacore.examenes.dto.InicioControlResponse;
import com.nexacore.examenes.dto.InicioDocenteResponse;
import com.nexacore.examenes.services.InicioAdminService;
import com.nexacore.examenes.services.InicioControlService;
import com.nexacore.examenes.services.InicioDocenteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Panel de inicio. GET /api/v1/inicio/admin: resumen del día y de la última semana. */
@Tag(name = "Inicio", description = "Resumen del día para el panel de inicio")
@RestController
@RequestMapping("/inicio")
public class InicioController {

    private final InicioAdminService inicioAdminService;
    private final InicioControlService inicioControlService;
    private final InicioDocenteService inicioDocenteService;

    public InicioController(InicioAdminService inicioAdminService, InicioControlService inicioControlService,
                            InicioDocenteService inicioDocenteService) {
        this.inicioAdminService = inicioAdminService;
        this.inicioControlService = inicioControlService;
        this.inicioDocenteService = inicioDocenteService;
    }

    @Operation(summary = "Resumen del día del ADMIN",
            description = "Asociados, ingresos, ausentes e incidencias de hoy; ingresos por hora; asistencia e "
                    + "incidencias de los últimos 7 días; intentos incorrectos por motivo y pendientes por revisar. "
                    + "Quien ve todos los exámenes y los reportes.")
    @PreAuthorize("@permisos.tiene(authentication,'EXAMENES_VER_TODOS') and @permisos.tiene(authentication,'REPORTES_VER')")
    @GetMapping("/admin")
    public InicioAdminResponse admin() {
        return inicioAdminService.resumen();
    }

    @Operation(summary = "Mis registros de hoy (CONTROL)",
            description = "Ingresos que autorizó, intentos incorrectos, fotos reportadas, QR duplicados y expulsiones de quien "
                    + "inició sesión, con sus ingresos por hora y sus últimos registros. No incluye los de otros controles.")
    @PreAuthorize("@permisos.alguno(authentication, 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')")
    @GetMapping("/control")
    public InicioControlResponse control() {
        return inicioControlService.misRegistros();
    }

    @Operation(summary = "Mi panel docente",
            description = "Sus materias con grupos, estudiantes, próximo examen y asistencia; ingresos y expulsiones de hoy "
                    + "por hora en sus exámenes, y sus últimos registros. Solo lo del docente que inició sesión.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/docente")
    public InicioDocenteResponse docente() {
        return inicioDocenteService.resumen();
    }
}
