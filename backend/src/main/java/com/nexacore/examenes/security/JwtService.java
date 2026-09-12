package com.nexacore.examenes.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * Genera y valida los tokens JWT del sistema SIGEX.
 *
 * El token se firma con HMAC-SHA256 usando la clave definida en
 * app.security.jwt.secret (variable de entorno JWT_SECRET).
 *
 * Payload: subject = email del usuario, claim "roles" = nombres de rol
 * SIN el prefijo "ROLE_" (tal como estan guardados en la tabla rol).
 *
 * Tarea B3 - Sprint 1.
 */
@Service
public class JwtService {

    private final SecretKey clave;
    private final long expiracionMs;

    public JwtService(@Value("${app.security.jwt.secret}") String secret,
                      @Value("${app.security.jwt.expiration-ms}") long expiracionMs) {
        // HMAC-SHA256 exige una clave de al menos 256 bits (32 caracteres).
        // Si es mas corta, jjwt lanza WeakKeyException al arrancar la aplicacion.
        this.clave = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiracionMs = expiracionMs;
    }

    /**
     * Genera un token firmado para el usuario autenticado.
     *
     * @param email correo institucional, viaja como "subject" del token
     * @param roles nombres de rol, por ejemplo ["ADMIN"]
     * @return token JWT compacto listo para enviar al cliente
     */
    public String generarToken(String email, List<String> roles) {
        Date ahora = new Date();
        Date vencimiento = new Date(ahora.getTime() + expiracionMs);

        return Jwts.builder()
                .setClaims(Map.of("roles", roles))
                .setSubject(email)
                .setIssuedAt(ahora)
                .setExpiration(vencimiento)
                .signWith(clave, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Indica si el token tiene una firma valida y no esta vencido.
     * Se usara en B5 (JwtAuthFilter) para proteger el resto de la API.
     */
    public boolean esValido(String token) {
        try {
            extraerClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Firma alterada, token vencido, malformado o vacio.
            return false;
        }
    }

    /** Devuelve el email (subject) contenido en el token. */
    public String extraerEmail(String token) {
        return extraerClaims(token).getSubject();
    }

    /** Devuelve los roles contenidos en el token. */
    @SuppressWarnings("unchecked")
    public List<String> extraerRoles(String token) {
        Object roles = extraerClaims(token).get("roles");
        return roles instanceof List ? (List<String>) roles : List.of();
    }

    /**
     * Verifica la firma y devuelve el contenido del token.
     * Lanza JwtException si el token no es confiable.
     */
    private Claims extraerClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(clave)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
