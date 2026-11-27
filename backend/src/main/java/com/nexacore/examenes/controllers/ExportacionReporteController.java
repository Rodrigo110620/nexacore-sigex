package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ExportarGrupoRequest;
import com.nexacore.examenes.dto.ExportarReporteRequest;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.AuditoriaService;
import com.nexacore.examenes.services.ExportacionReporteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;

/** Descargar un reporte en Excel o PDF (con permiso de exportar reportes: ADMIN y docente). */
@Tag(name = "Reportes", description = "Descarga de reportes")
@RestController
public class ExportacionReporteController {

    private final ExportacionReporteService service;
    private final UsuarioRepository usuarios;
    private final AuditoriaService auditoria;

    public ExportacionReporteController(ExportacionReporteService service, UsuarioRepository usuarios, AuditoriaService auditoria) {
        this.service = service;
        this.usuarios = usuarios;
        this.auditoria = auditoria;
    }

    @Operation(summary = "Descargar un reporte", description = "formato: xlsx o pdf. Da formato a la tabla que el usuario ya ve en Reportes.")
    @PreAuthorize("@permisos.tiene(authentication, 'REPORTES_EXPORTAR')")
    @PostMapping("/reportes/exportar.{formato}")
    public ResponseEntity<byte[]> exportar(@PathVariable String formato, @Valid @RequestBody ExportarReporteRequest request,
                                           Authentication authentication) {
        boolean pdf = "pdf".equalsIgnoreCase(formato);
        if (!pdf && !"xlsx".equalsIgnoreCase(formato)) throw new IllegalArgumentException("El formato debe ser xlsx o pdf.");
        String quien = usuarios.findByEmail(authentication.getName())
                .map(u -> (u.getNombre() + " " + u.getApellidos()).trim()).orElse(authentication.getName());
        byte[] contenido = pdf ? service.pdf(request, quien) : service.excel(request, quien);
        auditoria.registrar("REPORTE_EXPORTADO", AuditoriaService.datos("reporte", request.titulo(),
                "formato", pdf ? "PDF" : "Excel", "registros", request.filas().size()));
        String nombre = "reporte_" + slug(request.titulo()) + "_" + LocalDate.now(ZoneId.of("America/La_Paz")) + (pdf ? ".pdf" : ".xlsx");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nombre).build().toString())
                .contentType(pdf ? MediaType.APPLICATION_PDF
                        : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenido);
    }

    @Operation(summary = "Descargar todo un grupo de reportes", description = "xlsx: una hoja por tipo; pdf: una sección por tipo.")
    @PreAuthorize("@permisos.tiene(authentication, 'REPORTES_EXPORTAR')")
    @PostMapping("/reportes/exportar-grupo.{formato}")
    public ResponseEntity<byte[]> exportarGrupo(@PathVariable String formato, @Valid @RequestBody ExportarGrupoRequest request,
                                                Authentication authentication) {
        boolean pdf = "pdf".equalsIgnoreCase(formato);
        if (!pdf && !"xlsx".equalsIgnoreCase(formato)) throw new IllegalArgumentException("El formato debe ser xlsx o pdf.");
        String quien = usuarios.findByEmail(authentication.getName())
                .map(u -> (u.getNombre() + " " + u.getApellidos()).trim()).orElse(authentication.getName());
        byte[] contenido = pdf ? service.pdf(request, quien) : service.excel(request, quien);
        int registros = request.secciones().stream().mapToInt(x -> x.filas().size()).sum();
        auditoria.registrar("REPORTE_EXPORTADO", AuditoriaService.datos("reporte", request.titulo(),
                "formato", pdf ? "PDF" : "Excel", "registros", registros));
        String nombre = "reporte_" + slug(request.titulo()) + "_" + LocalDate.now(ZoneId.of("America/La_Paz")) + (pdf ? ".pdf" : ".xlsx");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nombre).build().toString())
                .contentType(pdf ? MediaType.APPLICATION_PDF
                        : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(contenido);
    }

    private static String slug(String texto) {
        String s = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
        s = s.replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
        return s.isEmpty() ? "sigex" : s.substring(0, Math.min(40, s.length()));
    }
}
