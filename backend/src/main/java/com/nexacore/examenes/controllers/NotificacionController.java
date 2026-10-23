package com.nexacore.examenes.controllers;

import com.nexacore.examenes.dto.NotificacionResponse;
import com.nexacore.examenes.services.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/notificaciones")
@Tag(name = "Notificaciones", description = "Avisos en vivo de los reportes del control de ingreso")
@PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE', 'CONTROL')")
public class NotificacionController {

    private final NotificacionService notificacionService;

    public NotificacionController(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @Operation(summary = "Últimas notificaciones",
            description = "ADMIN y CONTROL: todos los reportes. DOCENTE: los de sus exámenes. Con su marca de leída.")
    @GetMapping
    public ResponseEntity<List<NotificacionResponse>> listar(Authentication authentication) {
        return ResponseEntity.ok(notificacionService.listar(authentication));
    }

    @Operation(summary = "Notificaciones en vivo (Server-Sent Events)",
            description = "Evento 'notificacion' con cada reporte nuevo. Requiere el token en la cabecera Authorization.")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Authentication authentication, HttpServletResponse response) {
        // nginx no debe retener los eventos en su búfer.
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        return notificacionService.suscribir(authentication);
    }

    @PostMapping("/{id}/leida")
    public ResponseEntity<Void> marcarLeida(@PathVariable Integer id, Authentication authentication) {
        notificacionService.marcarLeida(id, authentication);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/leidas")
    public ResponseEntity<Void> marcarTodasLeidas(Authentication authentication) {
        notificacionService.marcarTodasLeidas(authentication);
        return ResponseEntity.noContent().build();
    }
}
