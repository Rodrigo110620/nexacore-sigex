package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AmbienteResponse;
import com.nexacore.examenes.dto.AmbienteDisponibilidadResponse;
import com.nexacore.examenes.dto.CrearAmbienteRequest;
import com.nexacore.examenes.services.AmbienteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Tag(name = "Ambientes", description = "Catálogo de aulas / ambientes de evaluación")
@RestController
@RequestMapping("/ambientes")
public class AmbienteController {

    private final AmbienteService ambienteService;

    public AmbienteController(AmbienteService ambienteService) {
        this.ambienteService = ambienteService;
    }

    @Operation(summary = "Listar ambientes", description = "Catálogo ordenado por nombre. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<AmbienteResponse>> listar() {
        return ResponseEntity.ok(ambienteService.listar());
    }

    @Operation(summary = "Crear ambiente", description = "Alta de aula/ambiente. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<AmbienteResponse> crear(@Valid @RequestBody CrearAmbienteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ambienteService.crear(request));
    }

    @Operation(summary = "Disponibilidad de ambientes",
               description = "Devuelve todos los ambientes con disponible=true/false para la fecha y horario indicados. Excluye el examen con idExamenExcluido si se edita.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/disponibilidad")
    public ResponseEntity<List<AmbienteDisponibilidadResponse>> disponibilidad(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
            @RequestParam int duracionMinutos,
            @RequestParam(required = false) Integer idExamenExcluido,
            @RequestParam(required = false) Integer idParaleloExcluido) {
        return ResponseEntity.ok(
                ambienteService.disponibilidad(fecha, horaInicio, duracionMinutos, idExamenExcluido, idParaleloExcluido));
    }
}
