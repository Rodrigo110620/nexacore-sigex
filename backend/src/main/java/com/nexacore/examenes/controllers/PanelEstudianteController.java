package com.nexacore.examenes.controllers;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.servlet.http.HttpServletResponse;

import com.nexacore.examenes.services.NotificacionService;

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
import java.util.Map;

/** Panel del estudiante: solo sus propios datos, a partir de la sesión. Rol ESTUDIANTE. */
@Tag(name = "Panel del estudiante", description = "Perfil, foto, exámenes y QR del estudiante con cuenta")
@RestController
@RequestMapping("/mi")
@PreAuthorize("hasRole('ESTUDIANTE')")
public class PanelEstudianteController {

    private final PanelEstudianteService panelService;
    private final NotificacionService notificacionService;

    public PanelEstudianteController(PanelEstudianteService panelService, NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
        this.panelService = panelService;
    }

    @Operation(summary = "Cambios en vivo (Server-Sent Events)",
            description = "Evento 'cambio' cuando cambia algo del estudiante o de sus exámenes (p. ej. su ingreso), "
                    + "para que el panel se actualice solo.")
    @GetMapping(value = "/eventos", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter eventos(Authentication authentication, HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        return notificacionService.suscribirEstudiante(authentication);
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
            description = "JPG, PNG o WEBP de hasta 150 KB. Pide la contraseña. La primera foto queda aprobada "
                    + "(200, APROBADA); un cambio queda pendiente hasta que lo apruebe la administración (202, PENDIENTE).")
    @PutMapping(value = "/foto", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> enviarFoto(Authentication authentication,
                                                          @RequestParam("file") MultipartFile file,
                                                          @RequestParam("password") String password) {
        if (panelService.enviarFoto(authentication.getName(), password, file)) {
            return ResponseEntity.ok(Map.of("estado", "APROBADA",
                    "mensaje", "Tu foto quedó registrada. Ya es la que usa el personal de control."));
        }
        return ResponseEntity.accepted().body(Map.of("estado", "PENDIENTE",
                "mensaje", "Tu foto nueva quedó pendiente. La administración la revisará."));
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
