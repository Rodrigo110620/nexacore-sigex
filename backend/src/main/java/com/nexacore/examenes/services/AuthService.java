package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.CambiarPasswordRequest;
import com.nexacore.examenes.dto.ForgotPasswordRequest;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.dto.PerfilResponse;
import com.nexacore.examenes.dto.ResetPasswordRequest;
import com.nexacore.examenes.exceptions.CredencialesInvalidasException;
import com.nexacore.examenes.exceptions.CuentaBloqueadaException;
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
import com.nexacore.examenes.security.PasswordPolicy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
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
    private final int maxIntentosFallidos;
    private final int minutosBloqueo;

    public AuthService(
            UsuarioRepository usuarioRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EmailService emailService,
            @Value("${app.password-reset.expiration-minutes:30}") int resetExpirationMinutes,
            @Value("${app.security.login.max-intentos:3}") int maxIntentosFallidos,
            @Value("${app.security.login.minutos-bloqueo:15}") int minutosBloqueo) {
        this.usuarioRepository = usuarioRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.resetExpirationMinutes = resetExpirationMinutes;
        this.maxIntentosFallidos = Math.max(1, maxIntentosFallidos);
        this.minutosBloqueo = Math.max(1, minutosBloqueo);
    }

    /**
     * Tras maxIntentosFallidos contraseñas incorrectas seguidas, la cuenta queda bloqueada
     * minutosBloqueo minutos; mientras dure, ni la contraseña correcta permite entrar.
     * El contador se guarda aunque se lance la excepción (noRollbackFor).
     */
    @Transactional(noRollbackFor = {
            CredencialesInvalidasException.class, CuentaBloqueadaException.class, CuentaInactivaException.class})
    public AuthResponse login(LoginRequest peticion) {
        Usuario usuario = usuarioRepository.findByEmail(peticion.email())
                .orElseThrow(CredencialesInvalidasException::new);

        LocalDateTime ahora = LocalDateTime.now();
        if (usuario.getBloqueadoHasta() != null && ahora.isBefore(usuario.getBloqueadoHasta())) {
            throw new CuentaBloqueadaException(minutosRestantes(ahora, usuario.getBloqueadoHasta()));
        }

        if (!passwordEncoder.matches(peticion.password(), usuario.getPassword())) {
            registrarIntentoFallido(usuario, ahora);
        }

        if (usuario.getIntentosFallidos() > 0 || usuario.getBloqueadoHasta() != null) {
            usuario.setIntentosFallidos(0);
            usuario.setBloqueadoHasta(null);
            usuarioRepository.save(usuario);
        }

        if (!ESTADO_ACTIVO.equalsIgnoreCase(usuario.getEstado())) {
            throw new CuentaInactivaException();
        }

        List<String> roles = obtenerRoles(usuario);
        String token = jwtService.generarToken(usuario.getEmail(), roles);
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellidos();

        return new AuthResponse(token, nombreCompleto, roles);
    }

    /** Suma el fallo y, al llegar al máximo, bloquea la cuenta y reinicia el contador. Siempre lanza. */
    private void registrarIntentoFallido(Usuario usuario, LocalDateTime ahora) {
        int intentos = usuario.getIntentosFallidos() + 1;
        if (intentos >= maxIntentosFallidos) {
            usuario.setIntentosFallidos(0);
            usuario.setBloqueadoHasta(ahora.plusMinutes(minutosBloqueo));
            usuarioRepository.save(usuario);
            throw new CuentaBloqueadaException(minutosBloqueo);
        }
        usuario.setIntentosFallidos(intentos);
        usuario.setBloqueadoHasta(null);
        usuarioRepository.save(usuario);
        throw new CredencialesInvalidasException();
    }

    /** Minutos que faltan, redondeados hacia arriba para no mostrar "0 minutos". */
    private static long minutosRestantes(LocalDateTime ahora, LocalDateTime hasta) {
        long segundos = Duration.between(ahora, hasta).getSeconds();
        return Math.max(1, (segundos + 59) / 60);
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
        PasswordPolicy.validate(request.passwordNueva());
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
        PasswordPolicy.validate(request.passwordNueva());
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
