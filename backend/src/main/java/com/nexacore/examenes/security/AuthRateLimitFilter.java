package com.nexacore.examenes.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limita intentos por IP en login / forgot / reset para mitigar fuerza bruta.
 * Ventana deslizante simple en memoria (suficiente para una instancia).
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/auth/login",
            "/auth/forgot-password",
            "/auth/reset-password"
    );

    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final int maxRequests;
    private final long windowMs;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(
            ObjectMapper objectMapper,
            @Value("${app.security.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.security.rate-limit.max-requests:10}") int maxRequests,
            @Value("${app.security.rate-limit.window-ms:60000}") long windowMs) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.maxRequests = Math.max(1, maxRequests);
        this.windowMs = Math.max(1000L, windowMs);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        if (!enabled) {
            return true;
        }
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = normalizePath(request);
        return PROTECTED_PATHS.stream().noneMatch(path::endsWith);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String key = clientKey(request) + "|" + normalizePath(request);
        long now = System.currentTimeMillis();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.startMs >= windowMs) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (window.count.get() > maxRequests) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(Math.max(1, windowMs / 1000)));
            objectMapper.writeValue(
                    response.getOutputStream(),
                    new ErrorResponse(
                            HttpStatus.TOO_MANY_REQUESTS.value(),
                            "Demasiados intentos. Espera un momento e intenta de nuevo."));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String normalizePath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            uri = uri.substring(context.length());
        }
        return uri;
    }

    private static String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }

    private record Window(long startMs, AtomicInteger count) {}
}
