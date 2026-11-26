package com.nexacore.examenes.controllers;

import com.nexacore.examenes.utils.TextoBusqueda;
import com.nexacore.examenes.dto.MateriaResponse;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.services.DocenteMateriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Materias", description = "Catálogo institucional de asignaturas")
@RestController
@RequestMapping("/materias")
public class MateriaController {

    private final MateriaRepository materiaRepository;
    private final DocenteMateriaService docenteMateriaService;

    public MateriaController(MateriaRepository materiaRepository, DocenteMateriaService docenteMateriaService) {
        this.materiaRepository = materiaRepository;
        this.docenteMateriaService = docenteMateriaService;
    }

    /** Plan de estudios (V63); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.MateriaCarreraService materiaCarreraService;

    @Operation(summary = "Materias con sus carreras", description = "Plan de estudios: a qué carreras pertenece cada materia. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/carreras")
    public ResponseEntity<List<com.nexacore.examenes.dto.MateriaConCarrerasResponse>> materiasConCarreras() {
        return ResponseEntity.ok(materiaCarreraService.listar());
    }

    /** Catálogo de materias (V64); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.MateriaCatalogoService materiaCatalogoService;

    @Operation(summary = "Crear materia", description = "Sigla, nombre y carreras. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.PostMapping
    public ResponseEntity<com.nexacore.examenes.dto.MateriaConCarrerasResponse> crear(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.nexacore.examenes.dto.MateriaRequest request) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(materiaCatalogoService.crear(request));
    }

    @Operation(summary = "Editar materia", description = "Sigla, nombre y (si se envían) carreras. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.PutMapping("/{idMateria}")
    public ResponseEntity<com.nexacore.examenes.dto.MateriaConCarrerasResponse> editar(
            @org.springframework.web.bind.annotation.PathVariable Integer idMateria,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.nexacore.examenes.dto.MateriaRequest request) {
        return ResponseEntity.ok(materiaCatalogoService.editar(idMateria, request));
    }

    @Operation(summary = "Activar o desactivar materia", description = "Desactivar no borra: deja de ofrecerse. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.PutMapping("/{idMateria}/estado")
    public ResponseEntity<com.nexacore.examenes.dto.MateriaConCarrerasResponse> cambiarEstado(
            @org.springframework.web.bind.annotation.PathVariable Integer idMateria, @RequestParam boolean activa) {
        return ResponseEntity.ok(materiaCatalogoService.cambiarEstado(idMateria, activa));
    }

    @Operation(summary = "Importar materias", description = "CSV con sigla;nombre;carreras (separadas por |). Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.PostMapping(value = "/importar", consumes = "multipart/form-data")
    public ResponseEntity<com.nexacore.examenes.dto.ImportacionMateriasResponse> importar(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        return ResponseEntity.ok(materiaCatalogoService.importar(file.getBytes(), file.getOriginalFilename()));
    }

    @Operation(summary = "Plantilla para importar materias", description = "csv o xlsx, con dos filas de ejemplo. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/plantilla.{formato}")
    public ResponseEntity<byte[]> plantilla(@org.springframework.web.bind.annotation.PathVariable String formato) {
        return archivo(formato, materiaCatalogoService.plantillaCsv(), materiaCatalogoService::plantillaXlsx, "plantilla_materias");
    }

    @Operation(summary = "Descargar el catálogo de materias", description = "csv o xlsx, para editarlo y volver a importarlo. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/catalogo.{formato}")
    public ResponseEntity<byte[]> catalogo(@org.springframework.web.bind.annotation.PathVariable String formato) {
        return archivo(formato, materiaCatalogoService.catalogoCsv(), materiaCatalogoService::catalogoXlsx, "plantilla_materias");
    }

    private static ResponseEntity<byte[]> archivo(String formato, byte[] csv, java.util.function.Supplier<byte[]> xlsx, String nombre) {
        boolean excel = "xlsx".equalsIgnoreCase(formato);
        if (!excel && !"csv".equalsIgnoreCase(formato)) {
            throw new IllegalArgumentException("El formato debe ser csv o xlsx.");
        }
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, org.springframework.http.ContentDisposition
                        .attachment().filename(nombre + (excel ? ".xlsx" : ".csv")).build().toString())
                .contentType(excel ? org.springframework.http.MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                        : org.springframework.http.MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(excel ? xlsx.get() : csv);
    }

    @Operation(summary = "Carreras de una materia", description = "Deja la materia con esas carreras; vacío = sin restricción. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.PutMapping("/{idMateria}/carreras")
    public ResponseEntity<com.nexacore.examenes.dto.MateriaConCarrerasResponse> asignarCarreras(
            @org.springframework.web.bind.annotation.PathVariable Integer idMateria,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.nexacore.examenes.dto.AsignarCarrerasRequest request) {
        return ResponseEntity.ok(materiaCarreraService.asignar(idMateria, request.idsCarrera()));
    }

    @Operation(summary = "Buscar asignaturas", description = "Búsqueda predictiva por nombre o sigla. Mínimo 3 caracteres. ADMIN o DOCENTE.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping
    public ResponseEntity<List<MateriaResponse>> buscar(
            @RequestParam(name = "search", defaultValue = "") String search) {
        String q = search == null ? "" : search.trim()
                .replace("\\", "")
                .replace("%", "")
                .replace("_", "");
        if (q.length() < 3) {
            return ResponseEntity.ok(List.of());
        }
        // IMP-12: el docente solo ve sus materias.
        Integer idDocente = docenteMateriaService.docenteDeLaSesion();
        java.util.Set<Integer> suyas = idDocente == null ? null
                : docenteMateriaService.materiasDe(idDocente).stream().map(MateriaResponse::id).collect(java.util.stream.Collectors.toSet());
        List<MateriaResponse> resultado = materiaRepository.buscar(TextoBusqueda.sinTildes(q)).stream()
                .filter(m -> suyas == null || suyas.contains(m.getId()))
                .limit(8)
                .map(m -> new MateriaResponse(m.getId(), m.getSigla(), m.getNombre()))
                .toList();
        return ResponseEntity.ok(resultado);
    }

    @Operation(summary = "Mis materias", description = "IMP-12: las materias asignadas al docente autenticado.")
    @PreAuthorize("@permisos.tiene(authentication, 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/mias")
    public List<MateriaResponse> mias() {
        Integer idDocente = docenteMateriaService.docenteDeLaSesion();
        if (idDocente == null) return List.of();
        // V64: para programar exámenes solo se ofrecen las materias activas.
        java.util.Set<Integer> activas = materiaRepository.findAll().stream().filter(com.nexacore.examenes.models.Materia::isActiva)
                .map(com.nexacore.examenes.models.Materia::getId).collect(java.util.stream.Collectors.toSet());
        return docenteMateriaService.materiasDe(idDocente).stream().filter(m -> activas.contains(m.id())).toList();
    }

    @Operation(summary = "Grupos ocupados de una materia",
            description = "Los grupos que ya tienen docente, para ofrecer solo los libres al asignar grupos a un docente. "
                    + "exceptoDocente: el docente que se edita (sus grupos no cuentan).")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/{idMateria}/grupos-ocupados")
    public List<String> gruposOcupados(@org.springframework.web.bind.annotation.PathVariable Integer idMateria,
                                       @RequestParam(required = false) Integer exceptoDocente) {
        return docenteMateriaService.gruposOcupados(idMateria, exceptoDocente);
    }

    @Operation(summary = "Grupos de una materia",
            description = "Los grupos (G1, G2…) de la materia con un docente y cuántos inscritos tienen, para elegir el grupo "
                    + "del examen. El DOCENTE solo ve los suyos.")
    @PreAuthorize("@permisos.alguno(authentication, 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS')")
    @GetMapping("/{idMateria}/grupos")
    public List<com.nexacore.examenes.dto.GrupoResponse> grupos(@org.springframework.web.bind.annotation.PathVariable Integer idMateria,
                                                                @RequestParam(required = false) Integer idDocente) {
        Integer docente = docenteMateriaService.docenteDeLaSesion();
        if (docente == null) docente = idDocente;
        if (docente == null) return List.of();
        return docenteMateriaService.gruposDe(docente, idMateria);
    }

}
