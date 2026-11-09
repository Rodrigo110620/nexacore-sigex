package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.IntentoIngresoResponse;
import com.nexacore.examenes.dto.RegistrarAmbienteIncorrectoRequest;
import com.nexacore.examenes.dto.RegistrarIntentoIngresoRequest;
import com.nexacore.examenes.services.IntentoIngresoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/intentos-ingreso")
public class IntentoIngresoController {
    private final IntentoIngresoService service;
    private final com.nexacore.examenes.services.ExamenAccesoService acceso;

    public IntentoIngresoController(IntentoIngresoService service, com.nexacore.examenes.services.ExamenAccesoService acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping
    public ResponseEntity<Void> registrar(@Valid @RequestBody RegistrarIntentoIngresoRequest request,
                                          Authentication authentication) {
        service.registrar(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** ACCS-06: estudiante del examen que se presentó en un aula distinta de la asignada. */
    @PreAuthorize("@examenAccesoService.puedeControlar(#request.idExamen, authentication)")
    @PostMapping("/ambiente-incorrecto")
    public ResponseEntity<IntentoIngresoResponse> registrarAmbienteIncorrecto(
            @Valid @RequestBody RegistrarAmbienteIncorrectoRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.registrarAmbienteIncorrecto(request, authentication.getName()));
    }

    @PreAuthorize("@examenAccesoService.puedeVerControl(#idExamen, authentication)")
    @GetMapping
    public ResponseEntity<List<IntentoIngresoResponse>> listar(@RequestParam Integer idExamen,
                                                                 @RequestParam(required = false) Integer idEstudiante) {
        return ResponseEntity.ok(service.listar(idExamen, idEstudiante));
    }

    /**
     * DASH-06 / HU#7: reporte de intentos incorrectos de todos los exámenes (o de uno). Con REPORTES_VER
     * (ADMIN), de todos; el DOCENTE y el CONTROL, solo de sus exámenes (los suyos o los asignados).
     */
    @PreAuthorize("@permisos.alguno(authentication, 'REPORTES_VER', 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')"
            + " and (#idExamen == null or @examenAccesoService.veTodosLosReportes(authentication) or @examenAccesoService.esMio(#idExamen, authentication))")
    @GetMapping("/reporte")
    public ResponseEntity<com.nexacore.examenes.dto.PageResponse<com.nexacore.examenes.dto.IntentoReporteResponse>> reporte(
            @RequestParam(required = false) Integer idExamen,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            org.springframework.security.core.Authentication authentication) {
        // Sin REPORTES_VER, solo sus exámenes; si no se encuentra el usuario, ninguno (nunca todos).
        Integer soloDe = acceso.veTodosLosReportes(authentication) ? null
                : java.util.Objects.requireNonNullElse(acceso.idUsuario(authentication), -1);
        return ResponseEntity.ok(service.reporte(idExamen, page, size, soloDe));
    }
}
