package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.CrearRolRequest;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.dto.UsuarioListResponse;
import com.nexacore.examenes.dto.UsuarioStatsResponse;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
/**
 * Gestión de usuarios del sistema (HU#2).
 *
 * Todos los endpoints requieren rol ADMIN (verificado con @PreAuthorize).
 * La URL final incluye el context-path /api/v1 definido en application.yml:
 *   POST /api/v1/usuarios        → registrar usuario
 *   GET  /api/v1/usuarios        → listar usuarios paginados (B1) con búsqueda y filtros (B2)
 *   GET  /api/v1/usuarios/roles  → listar roles disponibles
 */
@Tag(name = "Usuarios", description = "Registro y gestión de usuarios del sistema")
@RestController
@RequestMapping("/usuarios")
@CrossOrigin(origins = "http://localhost:3000")
public class UsuarioController {

    private final UsuarioService usuarioService;
    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }
    /**
     * Registra un nuevo usuario con el rol indicado.
     * Solo accesible para administradores.
     *
     * @return 201 Created con los datos del usuario creado
     */
    @Operation(summary = "Registrar usuario", description = "Crea un nuevo usuario y le asigna un rol. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
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
    /**
     * Lista todos los roles disponibles para el selector del formulario.
     * Solo accesible para administradores.
     *
     * @return 200 OK con la lista de roles: ADMIN, DOCENTE, CONTROL
     */
    @Operation(summary = "Listar roles", description = "Devuelve los roles disponibles para asignar al registrar un usuario.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/roles")
    public ResponseEntity<List<Rol>> listarRoles() {
        return ResponseEntity.ok(usuarioService.listarRoles());
    }
    @Operation(summary = "Crear rol", description = "Crea un nuevo rol en el sistema. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/roles")
    public ResponseEntity<Rol> crearRol(@Valid @RequestBody CrearRolRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.crearRol(request));
    }
    @Operation(summary = "Estadísticas de usuarios",
            description = "Devuelve el total de usuarios, cuántos hay por rol y por estado. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats")
    public ResponseEntity<UsuarioStatsResponse> obtenerEstadisticas() {
        return ResponseEntity.ok(usuarioService.obtenerEstadisticas());
    }
    @Operation(summary = "Actualizar usuario", description = "Modifica los datos y rol de un usuario existente. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<RegisterUserResponse> actualizar(
        @PathVariable Integer id, 
            @Valid @RequestBody RegisterUserRequest request) {
        return ResponseEntity.ok(usuarioService.actualizar(id, request));
    }
}