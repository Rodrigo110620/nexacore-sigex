package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.CambiarPasswordRequest;
import com.nexacore.examenes.dto.ForgotPasswordRequest;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.dto.PerfilResponse;
import com.nexacore.examenes.dto.ResetPasswordRequest;
import com.nexacore.examenes.exceptions.CredencialesInvalidasException;
import com.nexacore.examenes.exceptions.CuentaInactivaException;
import com.nexacore.examenes.exceptions.PasswordActualIncorrectaException;
import com.nexacore.examenes.exceptions.PasswordConfirmacionException;
import com.nexacore.examenes.exceptions.TokenResetInvalidoException;
import com.nexacore.examenes.models.PasswordResetToken;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.repositories.PasswordResetTokenRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Logica de autenticacion (HU AUTH-02), perfil y restablecimiento de contraseña.
 */
@Service
public class AuthService {

    private static final String ESTADO_ACTIVO = "activo";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final int resetExpirationMinutes;

    public AuthService(
            UsuarioRepository usuarioRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EmailService emailService,
            @Value("${app.password-reset.expiration-minutes:30}") int resetExpirationMinutes) {
        this.usuarioRepository = usuarioRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.resetExpirationMinutes = resetExpirationMinutes;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest peticion) {
        Usuario usuario = usuarioRepository.findByEmail(peticion.email())
                .orElseThrow(CredencialesInvalidasException::new);

        if (!passwordEncoder.matches(peticion.password(), usuario.getPassword())) {
            throw new CredencialesInvalidasException();
        }

        if (!ESTADO_ACTIVO.equalsIgnoreCase(usuario.getEstado())) {
            throw new CuentaInactivaException();
        }

        List<String> roles = obtenerRoles(usuario);
        String token = jwtService.generarToken(usuario.getEmail(), roles);
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellidos();

        return new AuthResponse(token, nombreCompleto, roles);
    }

    @Transactional(readOnly = true)
    public PerfilResponse obtenerPerfil(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(CredencialesInvalidasException::new);

        return new PerfilResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellidos(),
                usuario.getCi(),
                usuario.getEmail(),
                usuario.getEstado(),
                obtenerRoles(usuario)
        );
    }

    @Transactional
    public void cambiarPassword(String email, CambiarPasswordRequest request) {
        if (!request.passwordNueva().equals(request.passwordConfirmacion())) {
            throw new PasswordConfirmacionException();
        }

        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(CredencialesInvalidasException::new);

        if (!passwordEncoder.matches(request.passwordActual(), usuario.getPassword())) {
            throw new PasswordActualIncorrectaException();
        }

        if (passwordEncoder.matches(request.passwordNueva(), usuario.getPassword())) {
            throw new IllegalArgumentException("La nueva contraseña debe ser distinta a la actual");
        }

        usuario.setPassword(passwordEncoder.encode(request.passwordNueva()));
        usuarioRepository.save(usuario);
    }

    /**
     * Inicia el flujo de olvidar contraseña.
     * Siempre responde OK al cliente (no revela si el correo existe).
     */
    @Transactional
    public void solicitarResetPassword(ForgotPasswordRequest request) {
        Optional<Usuario> opt = usuarioRepository.findByEmail(request.email().trim());
        if (opt.isEmpty()) {
            return;
        }

        Usuario usuario = opt.get();
        if (!ESTADO_ACTIVO.equalsIgnoreCase(usuario.getEstado())) {
            return;
        }

        passwordResetTokenRepository.invalidatePendingForUsuario(usuario);

        String rawToken = generarTokenRaw();
        PasswordResetToken entity = new PasswordResetToken();
        entity.setUsuario(usuario);
        entity.setTokenHash(hashToken(rawToken));
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(resetExpirationMinutes));
        entity.setCreatedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(entity);

        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellidos();
        emailService.enviarResetPassword(usuario.getEmail(), nombreCompleto, rawToken, resetExpirationMinutes);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.passwordNueva().equals(request.passwordConfirmacion())) {
            throw new PasswordConfirmacionException();
        }

        PasswordResetToken token = passwordResetTokenRepository
                .findByTokenHashAndUsedAtIsNull(hashToken(request.token().trim()))
                .orElseThrow(TokenResetInvalidoException::new);

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new TokenResetInvalidoException();
        }

        Usuario usuario = token.getUsuario();
        if (usuario == null || !ESTADO_ACTIVO.equalsIgnoreCase(usuario.getEstado())) {
            throw new TokenResetInvalidoException();
        }

        if (passwordEncoder.matches(request.passwordNueva(), usuario.getPassword())) {
            throw new IllegalArgumentException("La nueva contraseña debe ser distinta a la actual");
        }

        usuario.setPassword(passwordEncoder.encode(request.passwordNueva()));
        usuarioRepository.save(usuario);

        token.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(token);
        passwordResetTokenRepository.invalidatePendingForUsuario(usuario);
    }

    private static String generarTokenRaw() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }

    private List<String> obtenerRoles(Usuario usuario) {
        if (usuario.getUsuarioRoles() == null) {
            return List.of();
        }
        return usuario.getUsuarioRoles().stream()
                .map(UsuarioRol::getIdRol)
                .filter(Objects::nonNull)
                .map(rol -> rol.getNombre())
                .filter(Objects::nonNull)
                .toList();
    }
}
