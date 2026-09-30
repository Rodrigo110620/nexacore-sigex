package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CarreraResponse;
import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.ImportarEstudiantesResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import com.nexacore.examenes.services.PlanillaEstudiantesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Estudiantes", description = "Gestión de estudiantes")
@RestController
@RequestMapping("/estudiantes")
public class EstudianteController {

    private final EstudianteService estudianteService;
    private final ImportacionEstudiantesService importacionEstudiantesService;
    private final PlanillaEstudiantesService planillaEstudiantesService;

    public EstudianteController(
        EstudianteService estudianteService,
        ImportacionEstudiantesService importacionEstudiantesService,
        PlanillaEstudiantesService planillaEstudiantesService
    ) {
        this.estudianteService = estudianteService;
        this.importacionEstudiantesService = importacionEstudiantesService;
        this.planillaEstudiantesService = planillaEstudiantesService;
    }

    @Operation(summary = "Listar estudiantes",
        description = "Devuelve los estudiantes paginados con búsqueda y filtros. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<PageResponse<EstudianteListResponse>> listar(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Integer idFacultad,
        @RequestParam(required = false) Integer idCarrera
    ) {
        return ResponseEntity.ok(
            estudianteService.listar(page, size, search, idFacultad, idCarrera)
        );
    }

    @Operation(summary = "Listar carreras",
        description = "Devuelve las carreras, opcionalmente filtradas por facultad.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/carreras")
    public ResponseEntity<List<CarreraResponse>> listarCarreras(
        @RequestParam(required = false) Integer idFacultad
    ) {
        return ResponseEntity.ok(estudianteService.listarCarreras(idFacultad));
    }

    @Operation(summary = "Registrar estudiante",
        description = "Crea un estudiante y lo asocia a su carrera. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<EstudianteListResponse> registrar(
        @Valid @RequestBody RegistrarEstudianteRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estudianteService.registrar(request));
    }

    @Operation(summary = "Importar estudiantes masivamente",
        description = "Importa estudiantes desde un CSV (separado por ',' o ';') con las columnas "
            + "codigoSis, nombre, apellidos, ci, email, idFacultad, idCarrera. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/importar", consumes = "multipart/form-data")
    public ResponseEntity<ImportarEstudiantesResponse> importarEstudiantes(
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(importacionEstudiantesService.importar(file));
    }

    @Operation(summary = "Descargar planilla de estudiantes en CSV",
        description = "Estudiantes registrados con las columnas de la importación masiva (IDs de facultad y carrera). Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/planilla.csv")
    public ResponseEntity<byte[]> planillaCsv() {
        return descarga(planillaEstudiantesService.csv(), "planilla_estudiantes.csv",
            new MediaType("text", "csv", StandardCharsets.UTF_8));
    }

    @Operation(summary = "Descargar planilla de estudiantes en PDF",
        description = "Estudiantes registrados con los nombres de su facultad y carrera. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/planilla.pdf")
    public ResponseEntity<byte[]> planillaPdf() {
        return descarga(planillaEstudiantesService.pdf(), "planilla_estudiantes.pdf", MediaType.APPLICATION_PDF);
    }

    private static ResponseEntity<byte[]> descarga(byte[] contenido, String nombreArchivo, MediaType tipo) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(nombreArchivo).build().toString())
            .contentType(tipo)
            .body(contenido);
    }
}
