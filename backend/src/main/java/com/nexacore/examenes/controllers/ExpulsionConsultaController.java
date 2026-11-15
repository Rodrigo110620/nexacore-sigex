package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ExpulsionResponse;
import com.nexacore.examenes.services.ExpulsionConsultaService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/control-ingresos")
@RequiredArgsConstructor
public class ExpulsionConsultaController {
    private final ExpulsionConsultaService service;
    private final com.nexacore.examenes.services.ExamenAccesoService acceso;

    /**
     * BUG-G02: expulsiones de todos los exámenes. El ADMIN (REPORTES_VER) ve todas; el DOCENTE y el CONTROL, solo las
     * de sus exámenes (los suyos o donde está asignado).
     */
    @GetMapping("/expulsiones")
    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_PROPIOS')")
    public List<ExpulsionResponse> listarTodas(org.springframework.security.core.Authentication authentication) {
        return service.listarDe(acceso.visibles(service.examenesConExpulsiones(), authentication));
    }

    @GetMapping("/examen/{idExamen}/expulsiones")
    @PreAuthorize("@examenAccesoService.puedeVerReportes(#idExamen, authentication)")
    public List<ExpulsionResponse> listar(@PathVariable Integer idExamen) {
        return service.listar(idExamen);
    }
}
