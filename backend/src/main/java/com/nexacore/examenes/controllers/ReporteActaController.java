package com.nexacore.examenes.controllers;

import com.nexacore.examenes.services.ActaExamenService;
import com.nexacore.examenes.services.ExamenAccesoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Descarga del acta de asistencia en PDF (HU#4 / HU#6).
 * Ruta: GET /reportes/examenes/{idExamen}/acta.pdf
 * Permiso: REPORTES_EXPORTAR (validado por ExamenAccesoService.puedeExportar).
 * El CONTROL no tiene ese permiso, por lo que recibe 403 si llama directamente a la URL.
 */
@Tag(name = "Reportes", description = "Exportación de actas de asistencia")
@RestController
@RequestMapping("/reportes")
public class ReporteActaController {

    private final ExamenAccesoService examenAccesoService;
    private final ActaExamenService actaExamenService;

    public ReporteActaController(ExamenAccesoService examenAccesoService,
                                 ActaExamenService actaExamenService) {
        this.examenAccesoService = examenAccesoService;
        this.actaExamenService = actaExamenService;
    }

    @Operation(summary = "Descargar acta de asistencia en PDF",
            description = "Genera el acta oficial con la consolidación de asistentes y ausentes. "
                    + "Con permiso de exportación: el ADMIN de cualquier examen y el DOCENTE de los suyos; el CONTROL "
                    + "recibe 403. Devuelve 409 si el examen aún no ha iniciado.")
    @PreAuthorize("@examenAccesoService.puedeExportar(#idExamen, authentication)")
    @GetMapping("/examenes/{idExamen}/acta.pdf")
    public ResponseEntity<byte[]> descargarActa(
            @PathVariable Integer idExamen,
            Authentication authentication) {
        byte[] pdf = actaExamenService.generarActa(idExamen);
        String nombre = java.util.Objects.requireNonNullElse(actaExamenService.nombreArchivo(idExamen), "acta_examen_" + idExamen + ".pdf");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(nombre).build().toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
