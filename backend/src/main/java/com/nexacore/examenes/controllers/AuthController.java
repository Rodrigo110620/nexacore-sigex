package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.services.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Capa de transporte REST del login (HU AUTH-02).
 *
 * La ruta se declara como "/auth" y NO como "/api/v1/auth" porque
 * application.yml ya define context-path: /api/v1. La URL final que
 * consume el frontend es POST /api/v1/auth/login.
 *
 * Respuestas: 200 OK, 400 Bad Request (validacion), 401 Unauthorized.
 * Las dos ultimas las produce el GlobalExceptionHandler.
 *
 * Tarea B4 - Sprint 1.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Autentica al usuario y devuelve su token JWT.
     *
     * @Valid activa las validaciones del LoginRequest antes de entrar al metodo.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest peticion) {
        return ResponseEntity.ok(authService.login(peticion));
    }
}
