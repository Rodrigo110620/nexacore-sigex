package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.MiExamenResponse;
import com.nexacore.examenes.dto.MiPerfilResponse;
import com.nexacore.examenes.dto.MiQrResponse;
import com.nexacore.examenes.services.PanelEstudianteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Panel del estudiante: solo sus propios datos, a partir de la sesión. Rol ESTUDIANTE. */
@Tag(name = "Panel del estudiante", description = "Perfil, foto, exámenes y QR del estudiante con cuenta")
@RestController
@RequestMapping("/mi")
@PreAuthorize("hasRole('ESTUDIANTE')")
public class PanelEstudianteController {

    private final PanelEstudianteService panelService;

    public PanelEstudianteController(PanelEstudianteService panelService) {
        this.panelService = panelService;
    }

    @Operation(summary = "Mis datos", description = "Datos de solo lectura, con el CI enmascarado.")
    @GetMapping("/perfil")
    public ResponseEntity<MiPerfilResponse> perfil(Authentication authentication) {
        return ResponseEntity.ok(panelService.perfil(authentication.getName()));
    }

    @Operation(summary = "Mi foto", description = "La foto aprobada. 404 si no tiene.")
    @GetMapping("/foto")
    public ResponseEntity<byte[]> foto(Authentication authentication) {
        return panelService.foto(authentication.getName())
                .map(foto -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(foto.getTipoContenido()))
                        .cacheControl(CacheControl.noStore())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(foto.getContenido()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Enviar una foto nueva",
            description = "JPG, PNG o WEBP de hasta 150 KB. Pide la contraseña. Queda pendiente hasta que la apruebe la administración.")
    @PutMapping(value = "/foto", consumes = "multipart/form-data")
    public ResponseEntity<Void> enviarFoto(Authentication authentication,
                                           @RequestParam("file") MultipartFile file,
                                           @RequestParam("password") String password) {
        panelService.solicitarCambioFoto(authentication.getName(), password, file);
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Mis exámenes", description = "Del más próximo al más lejano, con habilitación y resultado del ingreso.")
    @GetMapping("/examenes")
    public ResponseEntity<List<MiExamenResponse>> examenes(Authentication authentication) {
        return ResponseEntity.ok(panelService.examenes(authentication.getName()));
    }

    @Operation(summary = "Mi QR temporal",
            description = "QR cifrado que vence en 60 segundos; la app debe pedir uno nuevo antes de que venza.")
    @GetMapping("/qr")
    public ResponseEntity<MiQrResponse> qr(Authentication authentication) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(panelService.qr(authentication.getName()));
    }
}
