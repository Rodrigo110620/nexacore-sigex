package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.AuthResponse;
import com.nexacore.examenes.dto.LoginRequest;
import com.nexacore.examenes.exceptions.CredencialesInvalidasException;
import com.nexacore.examenes.exceptions.CuentaInactivaException;
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
 * Logica de autenticacion (HU AUTH-02).
 *
 * Orden de verificacion, en este orden a proposito:
 *   1. Buscar el usuario por email.
 *   2. Comparar la contrasena con BCrypt.
 *   3. Recien entonces revisar si la cuenta esta activa.
 *
 * Se revisa el estado al final para no revelar a un atacante que una
 * cuenta existe: solo quien ya acerto la contrasena llega a enterarse
 * de que la cuenta esta inactiva.
 *
 * Tarea B3 - Sprint 1. Cubre tambien el tercer item de B1
 * ("rechazar usuario si estado != activo"), que Aaron dejo para este servicio.
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

    /**
     * Autentica al usuario y devuelve su token JWT.
     *
     * @throws CredencialesInvalidasException si el email no existe o la contrasena no coincide
     * @throws CuentaInactivaException        si la cuenta existe pero su estado no es "activo"
     */
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

    /**
     * Extrae los nombres de rol del usuario.
     *
     * La coleccion usuarioRoles es LAZY, por eso este metodo solo funciona
     * dentro de la transaccion abierta por login(). Fuera de ella,
     * Hibernate lanzaria LazyInitializationException.
     */
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
