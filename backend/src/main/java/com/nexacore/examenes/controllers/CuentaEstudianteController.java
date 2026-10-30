package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.ConfirmarActivacionRequest;
import com.nexacore.examenes.dto.SolicitarActivacionRequest;
import com.nexacore.examenes.dto.VerificarCodigoActivacionRequest;
import com.nexacore.examenes.services.CuentaEstudianteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Activación de la cuenta del estudiante (público, con límite de intentos por IP). */
@Tag(name = "Cuenta del estudiante", description = "Activación de la cuenta del estudiante")
@RestController
@RequestMapping("/auth/estudiante/activacion")
public class CuentaEstudianteController {

    private final CuentaEstudianteService cuentaEstudianteService;

    public CuentaEstudianteController(CuentaEstudianteService cuentaEstudianteService) {
        this.cuentaEstudianteService = cuentaEstudianteService;
    }

    @Operation(summary = "Verificar identidad y enviar el código",
            description = "Siempre responde igual, existan o no los datos, para no revelar estudiantes.")
    @PostMapping("/solicitar")
    public ResponseEntity<Map<String, String>> solicitar(@Valid @RequestBody SolicitarActivacionRequest request) {
        cuentaEstudianteService.solicitarActivacion(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("mensaje",
                "Si los datos coinciden con un estudiante registrado sin cuenta, te enviamos un código a tu correo institucional."));
    }

    @Operation(summary = "Comprobar el código de verificación",
            description = "Antes de pedir la contraseña; cada código fallido cuenta en el límite de intentos.")
    @PostMapping("/verificar")
    public ResponseEntity<Map<String, String>> verificar(@Valid @RequestBody VerificarCodigoActivacionRequest request) {
        cuentaEstudianteService.verificarCodigo(request);
        return ResponseEntity.ok(Map.of("mensaje", "Código correcto. Crea tu contraseña."));
    }

    @Operation(summary = "Confirmar el código y crear la contraseña")
    @PostMapping("/confirmar")
    public ResponseEntity<Map<String, String>> confirmar(@Valid @RequestBody ConfirmarActivacionRequest request) {
        cuentaEstudianteService.confirmarActivacion(request);
        return ResponseEntity.ok(Map.of("mensaje", "Tu cuenta quedó activada. Te enviamos tu código QR a tu correo institucional. Ya puedes iniciar sesión."));
    }
}
