package com.nexacore.examenes.controllers;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.services.AuditoriaService;
import com.nexacore.examenes.services.RespaldoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Respaldo de la base de datos (IMP-10). Solo el ADMIN: el archivo contiene toda la base, por eso no
 * es un permiso que se pueda dar a un rol extra.
 */
@Tag(name = "Respaldo", description = "Descargar un respaldo completo de la base de datos")
@RestController
@RequestMapping("/admin/respaldo")
@PreAuthorize("hasRole('ADMIN')")
public class RespaldoController {

    private final RespaldoService respaldoService;
    private final AuditoriaService auditoriaService;

    public RespaldoController(RespaldoService respaldoService, AuditoriaService auditoriaService) {
        this.respaldoService = respaldoService;
        this.auditoriaService = auditoriaService;
    }

    @Operation(summary = "Descargar un respaldo de la base (SQL de pg_dump, se restaura con psql)")
    @GetMapping
    public ResponseEntity<StreamingResponseBody> descargar() throws IOException {
        // Se genera completo antes de enviarlo: si pg_dump falla, el ADMIN ve el error y no un archivo a medias.
        Path temporal = Files.createTempFile("sigex-respaldo-", ".sql");
        try (OutputStream salida = Files.newOutputStream(temporal)) {
            respaldoService.generar(salida);
        } catch (RuntimeException e) {
            Files.deleteIfExists(temporal);
            throw new ControlIngresoException(HttpStatus.SERVICE_UNAVAILABLE, "No se pudo generar el respaldo. " + e.getMessage());
        }
        long bytes = Files.size(temporal);
        String nombre = respaldoService.nombreArchivo(".sql");
        auditoriaService.registrar("RESPALDO_DESCARGADO", Map.of("archivo", nombre, "bytes", bytes));

        StreamingResponseBody cuerpo = destino -> {
            try (InputStream origen = Files.newInputStream(temporal)) {
                origen.transferTo(destino);
            } finally {
                Files.deleteIfExists(temporal);
            }
        };
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nombre).build().toString())
                .contentType(MediaType.parseMediaType("application/sql"))
                .contentLength(bytes)
                .body(cuerpo);
    }
}
