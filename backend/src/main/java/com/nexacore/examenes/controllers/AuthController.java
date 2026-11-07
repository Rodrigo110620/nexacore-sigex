package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.CambiarPasswordRequest;
import com.nexacore.examenes.dto.ForgotPasswordRequest;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.dto.PerfilResponse;
import com.nexacore.examenes.dto.ResetPasswordRequest;
import com.nexacore.examenes.services.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Autenticación y perfil del usuario logueado.
 *
 * POST /auth/login              → público
 * POST /auth/forgot-password    → público
 * POST /auth/reset-password     → público
 * GET  /auth/me                 → autenticado
 * PUT  /auth/cambiar-password   → autenticado
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final com.nexacore.examenes.services.PerfilRolService perfilRolService;
    private final com.nexacore.examenes.services.UsuarioFotoService usuarioFotoService;
    private final com.nexacore.examenes.repositories.UsuarioRepository usuarioRepository;

    public AuthController(AuthService authService, com.nexacore.examenes.services.PerfilRolService perfilRolService,
                          com.nexacore.examenes.services.UsuarioFotoService usuarioFotoService,
                          com.nexacore.examenes.repositories.UsuarioRepository usuarioRepository) {
        this.authService = authService;
        this.perfilRolService = perfilRolService;
        this.usuarioFotoService = usuarioFotoService;
        this.usuarioRepository = usuarioRepository;
    }

    private Integer yo(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName()).map(com.nexacore.examenes.models.Usuario::getId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Sesión no válida"));
    }

    /** Foto de perfil opcional del personal (V54). 404 si no tiene. */
    @GetMapping("/me/foto")
    public ResponseEntity<byte[]> miFoto(Authentication authentication) {
        return usuarioFotoService.obtener(yo(authentication))
                .map(f -> ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(f.tipoContenido()))
                        .cacheControl(org.springframework.http.CacheControl.noStore())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(f.contenido()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Sube o cambia su foto de perfil (hasta 150 KB, JPEG/PNG/WebP). */
    @PutMapping(value = "/me/foto", consumes = "multipart/form-data")
    public ResponseEntity<Void> subirMiFoto(Authentication authentication, @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        usuarioFotoService.guardar(yo(authentication), file);
        return ResponseEntity.noContent().build();
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/me/foto")
    public ResponseEntity<Void> quitarMiFoto(Authentication authentication) {
        usuarioFotoService.quitar(yo(authentication));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest peticion) {
        return ResponseEntity.ok(authService.login(peticion));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.solicitarResetPassword(request);
        return ResponseEntity.ok(Map.of(
                "mensaje",
                "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente. Ya puedes iniciar sesión."));
    }

    @GetMapping("/me")
    public ResponseEntity<PerfilResponse> miPerfil(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(authService.obtenerPerfil(email));
    }

    /** Mi perfil: lo propio de cada rol (permisos, datos y materias del docente, exámenes asignados al control). */
    @GetMapping("/me/rol")
    public ResponseEntity<com.nexacore.examenes.dto.PerfilRolResponse> miPerfilDelRol(Authentication authentication) {
        return ResponseEntity.ok(perfilRolService.deLaSesion(authentication));
    }

    @PutMapping("/cambiar-password")
    public ResponseEntity<Map<String, String>> cambiarPassword(
            Authentication authentication,
            @Valid @RequestBody CambiarPasswordRequest request) {
        authService.cambiarPassword(authentication.getName(), request);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente"));
    }
}
