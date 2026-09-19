package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.CambiarPasswordRequest;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.dto.PerfilResponse;
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
 * GET  /auth/me                 → autenticado
 * PUT  /auth/cambiar-password   → autenticado
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest peticion) {
        return ResponseEntity.ok(authService.login(peticion));
    }

    @GetMapping("/me")
    public ResponseEntity<PerfilResponse> miPerfil(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(authService.obtenerPerfil(email));
    }

    @PutMapping("/cambiar-password")
    public ResponseEntity<Map<String, String>> cambiarPassword(
            Authentication authentication,
            @Valid @RequestBody CambiarPasswordRequest request) {
        authService.cambiarPassword(authentication.getName(), request);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente"));
    }
}
