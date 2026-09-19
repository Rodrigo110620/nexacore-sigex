package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.CambiarPasswordRequest;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.dto.PerfilResponse;
import com.nexacore.examenes.exceptions.CredencialesInvalidasException;
import com.nexacore.examenes.exceptions.CuentaInactivaException;
import com.nexacore.examenes.exceptions.PasswordActualIncorrectaException;
import com.nexacore.examenes.exceptions.PasswordConfirmacionException;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Logica de autenticacion (HU AUTH-02) y perfil del usuario autenticado.
 */
@Service
public class AuthService {

    private static final String ESTADO_ACTIVO = "activo";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
