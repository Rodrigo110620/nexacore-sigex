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

    @GetMapping("/examen/{idExamen}/expulsiones")
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    public List<ExpulsionResponse> listar(@PathVariable Integer idExamen) {
        return service.listar(idExamen);
    }
}
