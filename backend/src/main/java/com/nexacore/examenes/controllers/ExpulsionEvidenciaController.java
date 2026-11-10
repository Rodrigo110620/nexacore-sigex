package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.EvidenciaExpulsionResponse;
import com.nexacore.examenes.services.ExpulsionEvidenciaService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Evidencia (fotos o capturas) de una expulsión. */
@RestController
@RequestMapping("/control-ingresos/examen/{idExamen}/expulsiones/{idExpulsion}/evidencias")
public class ExpulsionEvidenciaController {

    /** Cada operación queda en el historial de operaciones (Configuración). */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.AuditoriaService auditoria;

    private final ExpulsionEvidenciaService service;

    public ExpulsionEvidenciaController(ExpulsionEvidenciaService service) {
        this.service = service;
    }

    @Operation(summary = "Agregar evidencia a una expulsión",
            description = "Hasta 3 fotos JPG, PNG o WEBP de 5 MB. ADMIN o el docente del examen (quien puede expulsar).")
    @PreAuthorize("@examenAccesoService.puedeExpulsar(#idExamen, authentication)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<EvidenciaExpulsionResponse> agregar(@PathVariable Integer idExamen, @PathVariable Integer idExpulsion,
                                                   @RequestParam("files") List<MultipartFile> files) {
        var r = service.agregar(idExamen, idExpulsion, files);
        auditoria.registrar("EVIDENCIA_AGREGADA", com.nexacore.examenes.services.AuditoriaService.datos("idExamen", idExamen, "idExpulsion", idExpulsion, "archivos", files.size()));
        return r;
    }

    @Operation(summary = "Evidencias de una expulsión",
            description = "El ADMIN, el docente del examen y el personal de control asignado. El estudiante no.")
    @PreAuthorize("@examenAccesoService.puedeVerReportes(#idExamen, authentication)")
    @GetMapping
    public List<EvidenciaExpulsionResponse> listar(@PathVariable Integer idExamen, @PathVariable Integer idExpulsion) {
        return service.listar(idExamen, idExpulsion);
    }

    @Operation(summary = "Imagen de una evidencia")
    @PreAuthorize("@examenAccesoService.puedeVerReportes(#idExamen, authentication)")
    @GetMapping("/{idEvidencia}")
    public ResponseEntity<byte[]> imagen(@PathVariable Integer idExamen, @PathVariable Integer idExpulsion,
                                         @PathVariable Integer idEvidencia) {
        var evidencia = service.imagen(idExamen, idExpulsion, idEvidencia);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(evidencia.getTipoContenido()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(evidencia.getContenido());
    }
}
