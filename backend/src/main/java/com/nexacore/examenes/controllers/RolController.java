package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.GuardarRolRequest;
import com.nexacore.examenes.dto.PermisoResponse;
import com.nexacore.examenes.dto.RolConPermisosResponse;
import com.nexacore.examenes.services.RolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Configuración → Roles y permisos (permiso ROLES_GESTIONAR, que tiene el ADMIN). */
@Tag(name = "Roles y permisos", description = "Roles del sistema y roles extra con sus permisos")
@RestController
@RequestMapping("/roles")
@PreAuthorize("@permisos.tiene(authentication, 'ROLES_GESTIONAR')")
public class RolController {

    private final RolService rolService;

    public RolController(RolService rolService) {
        this.rolService = rolService;
    }

    @Operation(summary = "Roles con sus permisos y cuántos usuarios tienen cada uno")
    @GetMapping
    public List<RolConPermisosResponse> listar() {
        return rolService.listar();
    }

    @Operation(summary = "Catálogo de permisos")
    @GetMapping("/permisos")
    public List<PermisoResponse> permisos() {
        return rolService.catalogo();
    }

    @Operation(summary = "Crear un rol extra con sus permisos")
    @PostMapping
    public ResponseEntity<RolConPermisosResponse> crear(@Valid @RequestBody GuardarRolRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rolService.crear(request));
    }

    @Operation(summary = "Editar la descripción y los permisos de un rol extra")
    @PutMapping("/{id}")
    public RolConPermisosResponse actualizar(@PathVariable Integer id, @Valid @RequestBody GuardarRolRequest request) {
        return rolService.actualizar(id, request);
    }

    @Operation(summary = "Borrar un rol extra sin usuarios")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        rolService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
