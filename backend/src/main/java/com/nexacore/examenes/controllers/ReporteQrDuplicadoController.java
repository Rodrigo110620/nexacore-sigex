package com.nexacore.examenes.controllers;

import com.nexacore.examenes.services.ReporteQrDuplicadoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/reportes-qr-duplicado")
public class ReporteQrDuplicadoController {
    private final ReporteQrDuplicadoService service;
    public ReporteQrDuplicadoController(ReporteQrDuplicadoService service) { this.service = service; }
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Integer> registrar(@RequestParam Integer idExamen, @RequestParam Integer idEstudianteQr,
            @RequestParam String nombresPresentado, @RequestParam(required = false) String ciPresentado,
            @RequestParam(defaultValue = "true") boolean presentoCarnet,
            @RequestParam(required = false) String codigoSisPresentado, @RequestParam String detalle,
            @RequestParam String fechaHoraDispositivo, @RequestParam("foto") MultipartFile foto, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registrar(idExamen, idEstudianteQr, nombresPresentado,
                ciPresentado, presentoCarnet, codigoSisPresentado, detalle, fechaHoraDispositivo, foto, authentication.getName()));
    }
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/examen/{idExamen}")
    public ResponseEntity<java.util.List<com.nexacore.examenes.dto.ReporteQrDuplicadoResponse>> listar(@PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.listar(idExamen));
    }
    @PreAuthorize("@examenAccesoService.puedeControlar(#idExamen, authentication)")
    @GetMapping("/examen/{idExamen}/{idReporte}/foto")
    public ResponseEntity<byte[]> foto(@PathVariable Integer idExamen, @PathVariable Integer idReporte) {
        var reporte = service.obtener(idExamen, idReporte);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(reporte.getFotoTipoContenido()))
                .header("X-Content-Type-Options", "nosniff").body(reporte.getFotoContenido());
    }
}
