package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.nexacore.examenes.dto.UsuarioUpdateDTO;
import java.util.Map;

import java.util.List;

/**
 * Gestión de usuarios del sistema (HU#2).
 *
 * Ambos endpoints requieren rol ADMIN (verificado con @PreAuthorize).
 * La URL final incluye el context-path /api/v1 definido en application.yml:
 *   POST /api/v1/usuarios        → registrar usuario
 *   GET  /api/v1/usuarios/roles  → listar roles disponibles
 */
@Tag(name = "Usuarios", description = "Registro y gestión de usuarios del sistema")
@RestController
@RequestMapping("/usuarios")
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
    /**
     * Actualiza los datos y el rol de un usuario existente (HU#3).
     * Solo accesible para administradores.
     */
    @Operation(summary = "Actualizar usuario", description = "Modifica la información y estado de un usuario. Solo ADMIN.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(
            @PathVariable Integer id, 
            @Valid @RequestBody UsuarioUpdateDTO dto) {
        
        usuarioService.actualizarUsuario(id, dto);
        
        return ResponseEntity.ok(Map.of(
            "mensaje", "La información y los roles de acceso del usuario fueron actualizados correctamente."
        ));
    } 
}
