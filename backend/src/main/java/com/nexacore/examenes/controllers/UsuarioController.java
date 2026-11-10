package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AsignarMateriasRequest;
import com.nexacore.examenes.dto.CambiarEstadoUsuarioRequest;
import com.nexacore.examenes.dto.CrearRolRequest;
import com.nexacore.examenes.dto.ImportarUsuariosResponse;
import com.nexacore.examenes.dto.MateriaResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.dto.UsuarioListResponse;
import com.nexacore.examenes.dto.UsuarioStatsResponse;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.services.DocenteMateriaService;
import com.nexacore.examenes.services.ImportacionUsuariosService;
import com.nexacore.examenes.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.List;
/**
 * Gestión de usuarios del sistema.
 *
 * Todos los endpoints requieren rol ADMIN (verificado con @PreAuthorize).
 * La URL final incluye el context-path /api/v1 definido en application.yml:
 *   POST /api/v1/usuarios        → registrar usuario
 *   GET  /api/v1/usuarios        → listar usuarios paginados (B1) con búsqueda y filtros (B2)
 *   GET  /api/v1/usuarios/roles  → listar roles disponibles
 *   GET  /api/v1/usuarios/exportar.csv → exportar el listado filtrado
 *   POST /api/v1/usuarios/importar     → importar usuarios desde CSV
 *   PATCH /api/v1/usuarios/{id}/estado → bloquear o desbloquear
 */
@Tag(name = "Usuarios", description = "Registro y gestión de usuarios del sistema")
@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    /** Cada operación queda en el historial de operaciones (Configuración). */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.AuditoriaService auditoria;

    private final UsuarioService usuarioService;
    private final ImportacionUsuariosService importacionUsuariosService;
    private final DocenteMateriaService docenteMateriaService;
    public UsuarioController(UsuarioService usuarioService, ImportacionUsuariosService importacionUsuariosService,
                             DocenteMateriaService docenteMateriaService) {
        this.docenteMateriaService = docenteMateriaService;
        this.usuarioService = usuarioService;
        this.importacionUsuariosService = importacionUsuariosService;
    }
    /**
     * Registra un nuevo usuario con el rol indicado.
     * Solo accesible para administradores.
     *
     * @return 201 Created con los datos del usuario creado
     */
    @Operation(summary = "Registrar usuario", description = "Crea un nuevo usuario y le asigna un rol. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @PostMapping
    public ResponseEntity<RegisterUserResponse> registrar(@Valid @RequestBody RegisterUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.registrar(request));
    }
    /**
     * Lista los usuarios registrados, paginados y ordenados por nombre ascendente (B1),
     * con búsqueda y filtros opcionales que se combinan entre sí (B2).
     * Solo accesible para administradores. Nunca expone el password.
     *
     * @param page   número de página, empezando en 0 (por defecto 0)
     * @param size   cantidad de usuarios por página, entre 1 y 100 (por defecto 10)
     * @param search texto parcial en nombre, apellidos, email o CI, sin distinguir mayúsculas (opcional)
     * @param rol    ADMIN, DOCENTE o CONTROL (opcional)
     * @param estado activo o inactivo (opcional)
     * @return 200 OK con la página de usuarios, total de registros y total de páginas
     */
    @Operation(summary = "Listar usuarios",
            description = "Devuelve los usuarios registrados paginados y ordenados por nombre. "
                    + "Admite búsqueda por nombre, apellidos, email o CI y filtros por rol y estado. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping
    public ResponseEntity<PageResponse<UsuarioListResponse>> listar(
            @Parameter(description = "Número de página, empezando en 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Usuarios por página (1 a 100)")
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Texto parcial a buscar en nombre, apellidos, email o CI (sin distinguir mayúsculas)")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filtra por rol: ADMIN, DOCENTE o CONTROL")
            @RequestParam(required = false) String rol,
            @Parameter(description = "Filtra por estado: activo o inactivo")
            @RequestParam(required = false) String estado) {
        return ResponseEntity.ok(usuarioService.listar(page, size, search, rol, estado));
    }
    @Operation(summary = "Foto de perfil de un usuario", description = "La foto opcional del personal (V54), para mostrarla en el listado. 404 si no tiene. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> foto(@PathVariable Integer id) {
        return usuarioFotoService.obtener(id)
                .map(f -> ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(f.tipoContenido()))
                        .cacheControl(org.springframework.http.CacheControl.noStore())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(f.contenido()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Foto de perfil del personal (V54); por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired
    private com.nexacore.examenes.services.UsuarioFotoService usuarioFotoService;

    /**
     * Lista todos los roles disponibles para el selector del formulario.
     * Solo accesible para administradores.
     *
     * @return 200 OK con la lista de roles: ADMIN, DOCENTE, CONTROL
     */
    @Operation(summary = "Listar roles", description = "Devuelve los roles disponibles para asignar al registrar un usuario.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/roles")
    public ResponseEntity<List<Rol>> listarRoles() {
        return ResponseEntity.ok(usuarioService.listarRoles());
    }
    @Operation(summary = "Crear rol", description = "Crea un nuevo rol en el sistema. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'ROLES_GESTIONAR')")
    @PostMapping("/roles")
    public ResponseEntity<Rol> crearRol(@Valid @RequestBody CrearRolRequest request) {
        Rol rol = usuarioService.crearRol(request);
        auditoria.registrar("ROL_CREADO", com.nexacore.examenes.services.AuditoriaService.datos("nombre", rol.getNombre(), "permisos", java.util.List.of()));
        return ResponseEntity.status(HttpStatus.CREATED).body(rol);
    }
    @Operation(summary = "Estadísticas de usuarios",
            description = "Devuelve el total de usuarios, cuántos hay por rol y por estado. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/stats")
    public ResponseEntity<UsuarioStatsResponse> obtenerEstadisticas() {
        return ResponseEntity.ok(usuarioService.obtenerEstadisticas());
    }
    @Operation(summary = "Exportar usuarios en CSV",
            description = "Usuarios que cumplen la búsqueda y los filtros del listado, sin paginar. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/exportar.csv")
    public ResponseEntity<byte[]> exportarCsv(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) String estado) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("usuarios.csv").build().toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(usuarioService.exportarCsv(search, rol, estado));
    }

    @Operation(summary = "Exportar usuarios en Excel",
            description = "El mismo listado que el CSV (búsqueda y filtros, sin paginar), en .xlsx. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/exportar.xlsx")
    public ResponseEntity<byte[]> exportarXlsx(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) String estado) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("usuarios.xlsx").build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(com.nexacore.examenes.services.CsvAExcel.convertir(usuarioService.exportarCsv(search, rol, estado), "Usuarios"));
    }

    @Operation(summary = "Importar usuarios masivamente",
            description = "Registra usuarios desde un CSV (separado por ',' o ';') con las columnas "
                    + "nombre, apellidos, ci, email, rol y, opcional, estado (activo/inactivo). "
                    + "Cada usuario recibe su contraseña temporal por correo. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @PostMapping(value = "/importar", consumes = "multipart/form-data")
    public ResponseEntity<ImportarUsuariosResponse> importar(@RequestParam("file") MultipartFile file) {
        ImportarUsuariosResponse r = importacionUsuariosService.importar(file);
        auditoria.registrar("USUARIOS_IMPORTADOS", com.nexacore.examenes.services.AuditoriaService.datos("archivo", file.getOriginalFilename(), "insertados", r.insertados(), "ignorados", r.ignorados()));
        return ResponseEntity.ok(r);
    }

    @Operation(summary = "Bloquear o desbloquear usuario",
            description = "activo=false bloquea la cuenta; activo=true la desbloquea, incluido el bloqueo "
                    + "por intentos fallidos. Un ADMIN no puede bloquearse a sí mismo. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @PatchMapping("/{id}/estado")
    public ResponseEntity<UsuarioListResponse> cambiarEstado(
            @PathVariable Integer id,
            @Valid @RequestBody CambiarEstadoUsuarioRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(usuarioService.cambiarEstado(id, request.activo(), authentication.getName()));
    }

    @Operation(summary = "Actualizar usuario", description = "Modifica los datos y rol de un usuario existente. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @PutMapping("/{id}")
    public ResponseEntity<RegisterUserResponse> actualizar(
        @PathVariable Integer id, 
            @Valid @RequestBody RegisterUserRequest request) {
        return ResponseEntity.ok(usuarioService.actualizar(id, request));
    }

    @Operation(summary = "Datos del docente", description = "Título, especialidad y categoría, para editarlos. 204 si no es docente. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/{id}/docente")
    public ResponseEntity<com.nexacore.examenes.dto.DatosDocenteRequest> datosDocente(@PathVariable Integer id) {
        var datos = usuarioService.datosDocente(id);
        return datos == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(datos);
    }

    @Operation(summary = "Materias del docente", description = "IMP-12: las materias que el docente puede usar al programar exámenes, con sus grupos (G1, G2…). Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @GetMapping("/{id}/materias")
    public List<com.nexacore.examenes.dto.MateriaConGruposResponse> materias(@PathVariable Integer id) {
        return docenteMateriaService.materiasConGrupos(id);
    }

    @Operation(summary = "Asignar materias al docente", description = "IMP-12: reemplaza sus materias (al menos una) y, si se envían, los grupos de cada una. Solo ADMIN.")
    @PreAuthorize("@permisos.tiene(authentication, 'USUARIOS_GESTIONAR')")
    @PutMapping("/{id}/materias")
    public List<com.nexacore.examenes.dto.MateriaConGruposResponse> asignarMaterias(@PathVariable Integer id, @Valid @RequestBody AsignarMateriasRequest request) {
        docenteMateriaService.asignar(id, request.idMaterias(), request.grupos());
        auditoria.registrar("MATERIAS_ASIGNADAS", com.nexacore.examenes.services.AuditoriaService.datos("idUsuario", id, "idMaterias", request.idMaterias()));
        return docenteMateriaService.materiasConGrupos(id);
    }
}
