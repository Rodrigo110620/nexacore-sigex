package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CarreraResponse;
import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.FotoPendienteResponse;
import com.nexacore.examenes.dto.RechazarFotoRequest;
import com.nexacore.examenes.dto.ReportarFotoRequest;
import com.nexacore.examenes.dto.ImportarEstudiantesResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.services.EstudianteAlcanceService;
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
import org.springframework.security.core.Authentication;
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
    private final EstudianteAlcanceService estudianteAlcance;

    public EstudianteController(
            EstudianteService estudianteService,
            ImportacionEstudiantesService importacionEstudiantesService,
            PlanillaEstudiantesService planillaEstudiantesService,
            EstudianteFotoService estudianteFotoService,
            EstudianteAlcanceService estudianteAlcance
    ) {
        this.estudianteService = estudianteService;
        this.importacionEstudiantesService = importacionEstudiantesService;
        this.planillaEstudiantesService = planillaEstudiantesService;
        this.estudianteFotoService = estudianteFotoService;
        this.estudianteAlcance = estudianteAlcance;
    }

    @Operation(summary = "Fotografía del estudiante",
            description = "Imagen para identificar al estudiante en el control de ingreso. 404 si no tiene. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_VER') and @estudianteAlcance.puedeVer(#id, authentication)")
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
            description = "Imagen JPG, PNG o WEBP de hasta 150 KB. Solo ADMIN: queda como foto oficial sin revisión, "
                    + "así que no la puede cambiar un docente (el docente reporta la foto si no coincide).")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @PutMapping(value = "/{id}/foto", consumes = "multipart/form-data")
    public ResponseEntity<Void> subirFoto(@PathVariable Integer id, @RequestParam("file") MultipartFile file) {
        estudianteFotoService.guardar(id, file);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Quitar la fotografía",
            description = "Solo ADMIN: sin foto el estudiante no puede ingresar a ningún examen.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @DeleteMapping("/{id}/foto")
    public ResponseEntity<Void> quitarFoto(@PathVariable Integer id) {
        estudianteFotoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Revisión de fotos",
            description = "Cambios de foto enviados por los estudiantes y fotos reportadas por el personal de control, "
                    + "de la más antigua a la más reciente. ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @GetMapping("/fotos-pendientes")
    public ResponseEntity<List<FotoPendienteResponse>> fotosPendientes() {
        return ResponseEntity.ok(estudianteFotoService.listarRevision());
    }

    @Operation(summary = "Reportar foto que no coincide",
            description = "El estudiante deberá volver a escanear su rostro y la administración revisará la nueva foto. "
                    + "No autoriza ni deniega el ingreso. 409 si ya tiene un reporte abierto. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REPORTAR')")
    @PostMapping("/{id}/foto/reportes")
    public ResponseEntity<Void> reportarFoto(@PathVariable Integer id, @Valid @RequestBody ReportarFotoRequest request,
                                             Authentication authentication) {
        estudianteFotoService.reportar(id, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @Operation(summary = "Reporte abierto de la foto",
            description = "Si la foto del estudiante fue reportada y espera la revisión del ADMIN: motivo, detalle, "
                    + "quién la reportó y cuándo. 204 si no tiene reporte abierto. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("@permisos.alguno(authentication, 'FOTOS_REPORTAR', 'FOTOS_REVISAR')")
    @GetMapping("/{id}/foto/reporte")
    public ResponseEntity<FotoPendienteResponse.Reporte> reporteFoto(@PathVariable Integer id) {
        return estudianteFotoService.reporteVigente(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Descartar el reporte de una foto",
            description = "La foto vigente es correcta: el estudiante ya no debe reemplazarla. ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @PostMapping("/{id}/foto/reportes/descartar")
    public ResponseEntity<Void> descartarReporte(@PathVariable Integer id) {
        estudianteFotoService.descartarReporte(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Foto enviada por el estudiante", description = "404 si no envió ninguna. ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
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
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @PostMapping("/{id}/foto-solicitud/aprobar")
    public ResponseEntity<Void> aprobarFoto(@PathVariable Integer id) {
        estudianteFotoService.aprobarSolicitud(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Rechazar la foto enviada",
            description = "La foto actual no cambia; el estudiante ve el motivo. ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @PostMapping("/{id}/foto-solicitud/rechazar")
    public ResponseEntity<Void> rechazarFoto(@PathVariable Integer id, @Valid @RequestBody RechazarFotoRequest request) {
        estudianteFotoService.rechazarSolicitud(id, request.motivo());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Listar estudiantes",
            description = "Devuelve los estudiantes paginados con búsqueda y filtros. ADMIN y CONTROL ven a todos; el DOCENTE, "
                    + "a los de sus paralelos y exámenes. Con idExamen (buscar a quién asociar a su examen), a todos.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_VER')")
    @GetMapping
    public ResponseEntity<PageResponse<EstudianteListResponse>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer idFacultad,
            @RequestParam(required = false) Integer idCarrera,
            @RequestParam(required = false) Integer idExamen,
            Authentication authentication
    ) {
        Integer idDocente = estudianteAlcance.docenteParaFiltrar(idExamen, authentication);
        return ResponseEntity.ok(
                estudianteService.listar(page, size, search, idFacultad, idCarrera, idDocente)
        );
    }

    @Operation(summary = "Listar carreras",
            description = "Devuelve las carreras, opcionalmente filtradas por facultad.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_VER')")
    @GetMapping("/carreras")
    public ResponseEntity<List<CarreraResponse>> listarCarreras(
            @RequestParam(required = false) Integer idFacultad
    ) {
        return ResponseEntity.ok(estudianteService.listarCarreras(idFacultad));
    }

    @Operation(summary = "Obtener estudiante por ID",
            description = "Devuelve un estudiante con sus carreras. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_VER') and @estudianteAlcance.puedeVer(#id, authentication)")
    @GetMapping("/{id}")
    public ResponseEntity<EstudianteListResponse> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(estudianteService.obtenerPorId(id));
    }

    @Operation(summary = "Actualizar estudiante",
            description = "Modifica los datos personales y académicos de un estudiante. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PutMapping("/{id}")
    public ResponseEntity<EstudianteListResponse> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody ActualizarEstudianteRequest request
    ) {
        return ResponseEntity.ok(estudianteService.actualizar(id, request));
    }

    @Operation(summary = "Registrar estudiante",
            description = "Crea un estudiante y lo asocia a su carrera. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PostMapping
    public ResponseEntity<EstudianteListResponse> registrar(
            @Valid @RequestBody RegistrarEstudianteRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estudianteService.registrar(request));
    }

    @Operation(summary = "Regenerar y reenviar QR",
            description = "Revoca el QR anterior y envía uno nuevo. ADMIN con cualquier estudiante; DOCENTE, solo con los suyos.")
    @PreAuthorize("@estudianteAlcance.puedeRegenerarQr(#id, authentication)")
    @PostMapping("/{id}/qr/regenerar")
    public ResponseEntity<Void> regenerarQr(@PathVariable Integer id) {
        estudianteService.regenerarYEnviarQr(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Importar estudiantes masivamente",
            description = "Importa estudiantes desde un CSV (separado por ',' o ';') con las columnas "
            + "codigoSis, nombre, apellidos, ci, email, idFacultad, idCarrera. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PostMapping(value = "/importar", consumes = "multipart/form-data")
    public ResponseEntity<ImportarEstudiantesResponse> importarEstudiantes(
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(importacionEstudiantesService.importar(file));
    }

    @Operation(summary = "Descargar planilla de estudiantes en CSV",
            description = "Estudiantes registrados con las columnas de la importación masiva (IDs de facultad y carrera). Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @GetMapping("/planilla.csv")
    public ResponseEntity<byte[]> planillaCsv() {
        return descarga(planillaEstudiantesService.csv(), "planilla_estudiantes.csv",
                new MediaType("text", "csv", StandardCharsets.UTF_8));
    }

    @Operation(summary = "Descargar planilla de estudiantes en PDF",
            description = "Estudiantes registrados con los nombres de su facultad y carrera. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
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
