package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CarreraResponse;
import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.FotoPendienteResponse;
import com.nexacore.examenes.dto.RechazarFotoRequest;
import com.nexacore.examenes.dto.ImportarEstudiantesResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.services.EstudianteFotoService;
import com.nexacore.examenes.services.EstudianteService;
import com.nexacore.examenes.services.ImportacionEstudiantesService;
import com.nexacore.examenes.services.PlanillaEstudiantesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;
import com.nexacore.examenes.dto.ActualizarEstudianteRequest;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Estudiantes", description = "Gestión de estudiantes")
@RestController
@RequestMapping("/estudiantes")
public class EstudianteController {

    private final EstudianteService estudianteService;
    private final ImportacionEstudiantesService importacionEstudiantesService;
    private final PlanillaEstudiantesService planillaEstudiantesService;
    private final EstudianteFotoService estudianteFotoService;

    public EstudianteController(
            EstudianteService estudianteService,
            ImportacionEstudiantesService importacionEstudiantesService,
            PlanillaEstudiantesService planillaEstudiantesService,
            EstudianteFotoService estudianteFotoService
    ) {
        this.estudianteService = estudianteService;
        this.importacionEstudiantesService = importacionEstudiantesService;
        this.planillaEstudiantesService = planillaEstudiantesService;
        this.estudianteFotoService = estudianteFotoService;
    }

    @Operation(summary = "Fotografía del estudiante",
            description = "Imagen para identificar al estudiante en el control de ingreso. 404 si no tiene. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE', 'CONTROL')")
    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> foto(@PathVariable Integer id) {
        return estudianteFotoService.obtener(id)
                .map(foto -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(foto.getTipoContenido()))
                        .cacheControl(CacheControl.noStore())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(foto.getContenido()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Subir o reemplazar la fotografía",
            description = "Imagen JPG, PNG o WEBP de hasta 150 KB. ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @PutMapping(value = "/{id}/foto", consumes = "multipart/form-data")
    public ResponseEntity<Void> subirFoto(@PathVariable Integer id, @RequestParam("file") MultipartFile file) {
        estudianteFotoService.guardar(id, file);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Quitar la fotografía", description = "ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @DeleteMapping("/{id}/foto")
    public ResponseEntity<Void> quitarFoto(@PathVariable Integer id) {
        estudianteFotoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Fotos enviadas por estudiantes",
            description = "Fotos que los estudiantes subieron desde su cuenta y esperan aprobación. ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/fotos-pendientes")
    public ResponseEntity<List<FotoPendienteResponse>> fotosPendientes() {
        return ResponseEntity.ok(estudianteFotoService.listarPendientes().stream()
                .map(s -> estudianteService.obtenerEntidad(s.getIdEstudiante())
                        .map(e -> new FotoPendienteResponse(e.getId(), e.getCodigoSis(), e.getNombre(),
                                e.getApellidos(), s.getEnviadaEn(), "/estudiantes/" + e.getId() + "/foto-solicitud"))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList());
    }

    @Operation(summary = "Foto enviada por el estudiante", description = "404 si no envió ninguna. ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/foto-solicitud")
    public ResponseEntity<byte[]> fotoSolicitud(@PathVariable Integer id) {
        return estudianteFotoService.obtenerSolicitud(id)
                .map(foto -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(foto.getTipoContenido()))
                        .cacheControl(CacheControl.noStore())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(foto.getContenido()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Aprobar la foto enviada",
            description = "Pasa a ser la foto que ve el personal de control. ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/foto-solicitud/aprobar")
    public ResponseEntity<Void> aprobarFoto(@PathVariable Integer id) {
        estudianteFotoService.aprobarSolicitud(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Rechazar la foto enviada",
            description = "La foto actual no cambia; el estudiante ve el motivo. ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/foto-solicitud/rechazar")
    public ResponseEntity<Void> rechazarFoto(@PathVariable Integer id, @Valid @RequestBody RechazarFotoRequest request) {
        estudianteFotoService.rechazarSolicitud(id, request.motivo());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Listar estudiantes",
            description = "Devuelve los estudiantes paginados con búsqueda y filtros. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE', 'CONTROL')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE', 'CONTROL')")
    @GetMapping("/carreras")
    public ResponseEntity<List<CarreraResponse>> listarCarreras(
            @RequestParam(required = false) Integer idFacultad
    ) {
        return ResponseEntity.ok(estudianteService.listarCarreras(idFacultad));
    }

    @Operation(summary = "Obtener estudiante por ID",
            description = "Devuelve un estudiante con sus carreras. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE', 'CONTROL')")
    @GetMapping("/{id}")
    public ResponseEntity<EstudianteListResponse> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(estudianteService.obtenerPorId(id));
    }

    @Operation(summary = "Actualizar estudiante",
            description = "Modifica los datos personales y académicos de un estudiante. ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @PutMapping("/{id}")
    public ResponseEntity<EstudianteListResponse> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody ActualizarEstudianteRequest request
    ) {
        return ResponseEntity.ok(estudianteService.actualizar(id, request));
    }

    @Operation(summary = "Registrar estudiante",
            description = "Crea un estudiante y lo asocia a su carrera. ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @PostMapping
    public ResponseEntity<EstudianteListResponse> registrar(
            @Valid @RequestBody RegistrarEstudianteRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estudianteService.registrar(request));
    }

    @Operation(summary = "Regenerar y reenviar QR", description = "Revoca el QR anterior y envía uno nuevo. ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @PostMapping("/{id}/qr/regenerar")
    public ResponseEntity<Void> regenerarQr(@PathVariable Integer id) {
        estudianteService.regenerarYEnviarQr(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Importar estudiantes masivamente",
            description = "Importa estudiantes desde un CSV (separado por ',' o ';') con las columnas "
            + "codigoSis, nombre, apellidos, ci, email, idFacultad, idCarrera. ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @PostMapping(value = "/importar", consumes = "multipart/form-data")
    public ResponseEntity<ImportarEstudiantesResponse> importarEstudiantes(
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(importacionEstudiantesService.importar(file));
    }

    @Operation(summary = "Descargar planilla de estudiantes en CSV",
            description = "Estudiantes registrados con las columnas de la importación masiva (IDs de facultad y carrera). ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    @GetMapping("/planilla.csv")
    public ResponseEntity<byte[]> planillaCsv() {
        return descarga(planillaEstudiantesService.csv(), "planilla_estudiantes.csv",
                new MediaType("text", "csv", StandardCharsets.UTF_8));
    }

    @Operation(summary = "Descargar planilla de estudiantes en PDF",
            description = "Estudiantes registrados con los nombres de su facultad y carrera. ADMIN y DOCENTE.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
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
