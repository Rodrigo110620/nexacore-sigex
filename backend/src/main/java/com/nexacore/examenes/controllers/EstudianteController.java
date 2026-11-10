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

    /** Cada operación queda en el historial de operaciones (Configuración). */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.AuditoriaService auditoria;

    private final EstudianteService estudianteService;
    private final ImportacionEstudiantesService importacionEstudiantesService;
    private final PlanillaEstudiantesService planillaEstudiantesService;
    private final EstudianteFotoService estudianteFotoService;
    private final EstudianteAlcanceService estudianteAlcance;

    /** Quién revisa una foto reportada (el DOCENTE y el CONTROL, en sus exámenes); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.FotoRevisionAcceso fotoRevisionAcceso;
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.ExamenAccesoService examenAccesoService;

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
        auditoria.registrar("ESTUDIANTE_FOTO_CAMBIADA", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Quitar la fotografía",
            description = "Solo ADMIN: sin foto el estudiante no puede ingresar a ningún examen.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REVISAR')")
    @DeleteMapping("/{id}/foto")
    public ResponseEntity<Void> quitarFoto(@PathVariable Integer id) {
        estudianteFotoService.eliminar(id);
        auditoria.registrar("ESTUDIANTE_FOTO_QUITADA", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Revisión de fotos",
            description = "Cambios de foto enviados por los estudiantes y fotos reportadas por el personal de control, "
                    + "de la más antigua a la más reciente. ADMIN.")
    @PreAuthorize("@permisos.alguno(authentication, 'FOTOS_REVISAR', 'FOTOS_REPORTAR')")
    @GetMapping("/fotos-pendientes")
    public ResponseEntity<List<FotoPendienteResponse>> fotosPendientes(Authentication authentication) {
        // El ADMIN ve todo; el DOCENTE y el CONTROL, solo las fotos reportadas en sus exámenes (suyos o asignados).
        if (com.nexacore.examenes.security.Permisos.tiene(authentication, com.nexacore.examenes.security.Permiso.FOTOS_REVISAR)) {
            return ResponseEntity.ok(estudianteFotoService.listarRevision());
        }
        return ResponseEntity.ok(estudianteFotoService.listarReportesDeExamenes(
                idExamen -> examenAccesoService.esMio(idExamen, authentication)));
    }

    @Operation(summary = "Reportar foto que no coincide",
            description = "El estudiante deberá volver a escanear su rostro y la administración revisará la nueva foto. "
                    + "No autoriza ni deniega el ingreso. 409 si ya tiene un reporte abierto. ADMIN, DOCENTE y CONTROL.")
    @PreAuthorize("@permisos.tiene(authentication, 'FOTOS_REPORTAR')")
    @PostMapping("/{id}/foto/reportes")
    public ResponseEntity<Void> reportarFoto(@PathVariable Integer id, @Valid @RequestBody ReportarFotoRequest request,
                                             Authentication authentication) {
        estudianteFotoService.reportar(id, request, authentication.getName());
        auditoria.registrar("FOTO_REPORTADA", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id, "idExamen", request.idExamen(), "causa", String.valueOf(request.motivo()), "motivo", request.detalle()));
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

    @Operation(summary = "Revisar el reporte de una foto",
            description = "El reporte abierto con su examen, la foto nueva si el estudiante ya la envió y si quien consulta "
                    + "puede resolverlo (ADMIN, o el DOCENTE y el CONTROL en sus exámenes). 204 si no hay reporte abierto.")
    @PreAuthorize("@permisos.alguno(authentication, 'FOTOS_REPORTAR', 'FOTOS_REVISAR') and @estudianteAlcance.puedeVer(#id, authentication)")
    @GetMapping("/{id}/foto/reporte/revision")
    public ResponseEntity<com.nexacore.examenes.dto.RevisionReporteFotoResponse> revisionReporte(@PathVariable Integer id,
                                                                                               Authentication authentication) {
        return estudianteFotoService.revisionDelReporte(id, fotoRevisionAcceso.puedeRevisar(id, authentication))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Descartar el reporte de una foto",
            description = "La foto vigente es correcta: el estudiante ya no debe reemplazarla. ADMIN, o el DOCENTE y el "
                    + "CONTROL si el reporte es de uno de sus exámenes.")
    @PreAuthorize("@fotoRevisionAcceso.puedeRevisar(#id, authentication)")
    @PostMapping("/{id}/foto/reportes/descartar")
    public ResponseEntity<Void> descartarReporte(@PathVariable Integer id) {
        estudianteFotoService.descartarReporte(id);
        auditoria.registrar("FOTO_REPORTE_DESCARTADO", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Foto enviada por el estudiante", description = "404 si no envió ninguna. ADMIN.")
    @PreAuthorize("@fotoRevisionAcceso.puedeRevisar(#id, authentication)")
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
    @PreAuthorize("@fotoRevisionAcceso.puedeRevisar(#id, authentication)")
    @PostMapping("/{id}/foto-solicitud/aprobar")
    public ResponseEntity<Void> aprobarFoto(@PathVariable Integer id) {
        estudianteFotoService.aprobarSolicitud(id);
        auditoria.registrar("FOTO_APROBADA", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Rechazar la foto enviada",
            description = "La foto actual no cambia; el estudiante ve el motivo. ADMIN.")
    @PreAuthorize("@fotoRevisionAcceso.puedeRevisar(#id, authentication)")
    @PostMapping("/{id}/foto-solicitud/rechazar")
    public ResponseEntity<Void> rechazarFoto(@PathVariable Integer id, @Valid @RequestBody RechazarFotoRequest request) {
        estudianteFotoService.rechazarSolicitud(id, request.motivo());
        auditoria.registrar("FOTO_RECHAZADA", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id, "motivo", request.motivo()));
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
            @RequestParam(required = false) Integer idMateria,
            @RequestParam(required = false) Integer idParalelo,
            Authentication authentication
    ) {
        Integer idDocente = estudianteAlcance.docenteParaFiltrar(idExamen, authentication);
        return ResponseEntity.ok(
                estudianteService.listar(page, size, search, idFacultad, idCarrera, idDocente, idMateria, idParalelo)
        );
    }

    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_VER')")
    @GetMapping("/materias-docente")
    public ResponseEntity<List<com.nexacore.examenes.dto.MateriaDocenteResponse>> materiasDocente(Authentication authentication) {
        return ResponseEntity.ok(estudianteService.materiasDelDocente(
                estudianteAlcance.docenteParaFiltrar(null, authentication)));
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
    public ResponseEntity<EstudianteListResponse> obtenerPorId(@PathVariable Integer id, Authentication authentication) {
        return ResponseEntity.ok(estudianteService.conMaterias(estudianteService.obtenerPorId(id),
                estudianteAlcance.docenteParaFiltrar(null, authentication)));
    }

    @Operation(summary = "Actualizar estudiante",
            description = "Modifica los datos personales y académicos de un estudiante. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PutMapping("/{id}")
    public ResponseEntity<EstudianteListResponse> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody ActualizarEstudianteRequest request
    ) {
        EstudianteListResponse r = estudianteService.actualizar(id, request);
        auditoria.registrar("ESTUDIANTE_EDITADO", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", r.id(), "nombre", r.nombre() + " " + r.apellidos(), "codigoSis", r.codigoSis()));
        return ResponseEntity.ok(r);
    }

    @Operation(summary = "Registrar estudiante",
            description = "Crea un estudiante y lo asocia a su carrera. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PostMapping
    public ResponseEntity<EstudianteListResponse> registrar(
            @Valid @RequestBody RegistrarEstudianteRequest request
    ) {
        EstudianteListResponse r = estudianteService.registrar(request);
        auditoria.registrar("ESTUDIANTE_CREADO", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", r.id(), "nombre", r.nombre() + " " + r.apellidos(), "codigoSis", r.codigoSis()));
        return ResponseEntity.status(HttpStatus.CREATED).body(r);
    }

    @Operation(summary = "Regenerar y reenviar QR",
            description = "Revoca el QR anterior y envía uno nuevo. ADMIN con cualquier estudiante; DOCENTE, solo con los suyos.")
    @PreAuthorize("@estudianteAlcance.puedeRegenerarQr(#id, authentication)")
    @PostMapping("/{id}/qr/regenerar")
    public ResponseEntity<Void> regenerarQr(@PathVariable Integer id) {
        estudianteService.regenerarYEnviarQr(id);
        auditoria.registrar("QR_REGENERADO", com.nexacore.examenes.services.AuditoriaService.datos("idEstudiante", id));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Importar estudiantes masivamente",
            description = "Importa estudiantes desde un CSV (separado por ',' o ';') o un Excel .xlsx (primera hoja) con las columnas "
            + "codigoSis, nombre, apellidos, ci, email, idFacultad, idCarrera. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PostMapping(value = "/importar", consumes = "multipart/form-data")
    public ResponseEntity<ImportarEstudiantesResponse> importarEstudiantes(
            @RequestParam("file") MultipartFile file
    ) {
        ImportarEstudiantesResponse r = importacionEstudiantesService.importar(file);
        auditoria.registrar("ESTUDIANTES_IMPORTADOS", com.nexacore.examenes.services.AuditoriaService.datos("archivo", file.getOriginalFilename(), "insertados", r.insertados(), "ignorados", r.ignorados()));
        return ResponseEntity.ok(r);
    }

    @Operation(summary = "Revisar una importación (sin guardar)",
            description = "Sección 22, paso Revisar: filas listas, con errores (fila, columna y mensaje) y ya registradas. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PostMapping(value = "/importar/revisar", consumes = "multipart/form-data")
    public com.nexacore.examenes.dto.RevisionImportacionResponse revisarImportacion(@RequestParam("file") MultipartFile file) {
        return importacionEstudiantesService.revisar(file);
    }

    @Operation(summary = "Iniciar una importación con avance",
            description = "Sección 22, paso Importando: valida y guarda en segundo plano por bloques de 500. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @PostMapping(value = "/importar/iniciar", consumes = "multipart/form-data")
    public com.nexacore.examenes.dto.ProgresoImportacionResponse iniciarImportacion(@RequestParam("file") MultipartFile file) {
        var r = importacionEstudiantesService.iniciar(file);
        auditoria.registrar("ESTUDIANTES_IMPORTADOS", com.nexacore.examenes.services.AuditoriaService.datos("archivo", file.getOriginalFilename(), "total", r.total()));
        return r;
    }

    @Operation(summary = "Avance de una importación", description = "Filas procesadas y, al terminar, el resultado. Solo quien la inició.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @GetMapping("/importar/{id}")
    public ResponseEntity<com.nexacore.examenes.dto.ProgresoImportacionResponse> progresoImportacion(@PathVariable String id) {
        var progreso = importacionEstudiantesService.progreso(id);
        return progreso == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(progreso);
    }

    @Operation(summary = "Plantilla para importar estudiantes (CSV)",
            description = "Sección 22: solo los encabezados y una fila de ejemplo. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @GetMapping("/plantilla.csv")
    public ResponseEntity<byte[]> plantillaCsv() {
        return descarga(planillaEstudiantesService.plantillaCsv(), "plantilla_estudiantes.csv",
                new MediaType("text", "csv", StandardCharsets.UTF_8));
    }

    @Operation(summary = "Plantilla para importar estudiantes (Excel)",
            description = "Sección 22: solo los encabezados y una fila de ejemplo. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ESTUDIANTES_GESTIONAR')")
    @GetMapping("/plantilla.xlsx")
    public ResponseEntity<byte[]> plantillaXlsx() {
        return descarga(planillaEstudiantesService.plantillaXlsx(), "plantilla_estudiantes.xlsx", XLSX);
    }

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    /** Los filtros de la pantalla de Estudiantes; el DOCENTE solo descarga a los estudiantes de sus materias y grupos. */
    private com.nexacore.examenes.services.PlanillaEstudiantesService.Filtro filtro(String search, Integer idFacultad,
            Integer idCarrera, Integer idMateria, Integer idParalelo, Authentication authentication) {
        return new com.nexacore.examenes.services.PlanillaEstudiantesService.Filtro(search, idFacultad, idCarrera,
                estudianteAlcance.docenteParaFiltrar(null, authentication), idMateria, idParalelo);
    }

    @Operation(summary = "Descargar planilla de estudiantes en Excel",
            description = "Los estudiantes con los filtros de la pantalla (facultad, carrera, materia y grupo). ADMIN; el DOCENTE, los suyos.")
    @PreAuthorize("@permisos.alguno(authentication, 'ESTUDIANTES_GESTIONAR', 'REPORTES_EXPORTAR')")
    @GetMapping("/planilla.xlsx")
    public ResponseEntity<byte[]> planillaXlsx(@RequestParam(required = false) String search,
            @RequestParam(required = false) Integer idFacultad, @RequestParam(required = false) Integer idCarrera,
            @RequestParam(required = false) Integer idMateria, @RequestParam(required = false) Integer idParalelo,
            Authentication authentication) {
        return descarga(planillaEstudiantesService.xlsx(filtro(search, idFacultad, idCarrera, idMateria, idParalelo, authentication)),
                "planilla_estudiantes.xlsx", XLSX);
    }

    @Operation(summary = "Descargar planilla de estudiantes en CSV",
            description = "Estudiantes con los filtros de la pantalla y las columnas de la importación (IDs de facultad y carrera). ADMIN; el DOCENTE, los suyos.")
    @PreAuthorize("@permisos.alguno(authentication, 'ESTUDIANTES_GESTIONAR', 'REPORTES_EXPORTAR')")
    @GetMapping("/planilla.csv")
    public ResponseEntity<byte[]> planillaCsv(@RequestParam(required = false) String search,
            @RequestParam(required = false) Integer idFacultad, @RequestParam(required = false) Integer idCarrera,
            @RequestParam(required = false) Integer idMateria, @RequestParam(required = false) Integer idParalelo,
            Authentication authentication) {
        return descarga(planillaEstudiantesService.csv(filtro(search, idFacultad, idCarrera, idMateria, idParalelo, authentication)), "planilla_estudiantes.csv",
                new MediaType("text", "csv", StandardCharsets.UTF_8));
    }

    @Operation(summary = "Descargar planilla de estudiantes en PDF",
            description = "Estudiantes con los filtros de la pantalla, con el nombre de su facultad y carrera. ADMIN; el DOCENTE, los suyos.")
    @PreAuthorize("@permisos.alguno(authentication, 'ESTUDIANTES_GESTIONAR', 'REPORTES_EXPORTAR')")
    @GetMapping("/planilla.pdf")
    public ResponseEntity<byte[]> planillaPdf(@RequestParam(required = false) String search,
            @RequestParam(required = false) Integer idFacultad, @RequestParam(required = false) Integer idCarrera,
            @RequestParam(required = false) Integer idMateria, @RequestParam(required = false) Integer idParalelo,
            Authentication authentication) {
        return descarga(planillaEstudiantesService.pdf(filtro(search, idFacultad, idCarrera, idMateria, idParalelo, authentication)), "planilla_estudiantes.pdf", MediaType.APPLICATION_PDF);
    }

    private static ResponseEntity<byte[]> descarga(byte[] contenido, String nombreArchivo, MediaType tipo) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(nombreArchivo).build().toString())
                .contentType(tipo)
                .body(contenido);
    }
}
