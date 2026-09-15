package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.exceptions.EmailDuplicadoException;
import com.nexacore.examenes.exceptions.RolInvalidoException;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.UsuarioRolRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lógica de negocio para la gestión de usuarios (HU#2).
 *
 * Orden de validaciones en registrar():
 *   1. Rol válido  → 400 si no es ADMIN/DOCENTE/CONTROL
 *   2. Email único → 409 si ya existe
 *   3. Guardar usuario con password hasheado + asignar rol
 */
@Service
public class UsuarioService {

    private static final List<String> ROLES_VALIDOS = List.of("ADMIN", "DOCENTE", "CONTROL");

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          UsuarioRolRepository usuarioRolRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Registra un nuevo usuario y le asigna el rol indicado.
     *
     * @throws RolInvalidoException    si el rol no es ADMIN, DOCENTE o CONTROL
     * @throws EmailDuplicadoException si el email ya está en uso
     */
    @Transactional
    public RegisterUserResponse registrar(RegisterUserRequest request) {

        String rolNombre = request.rol().toUpperCase();

        if (!ROLES_VALIDOS.contains(rolNombre)) {
            throw new RolInvalidoException(request.rol());
        }

        if (usuarioRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailDuplicadoException(request.email());
        }

        Rol rol = rolRepository.findByNombre(rolNombre)
                .orElseThrow(() -> new RolInvalidoException(rolNombre));

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre());
        usuario.setApellidos(request.apellidos());
        usuario.setCi(request.ci());
        usuario.setEmail(request.email());
        usuario.setPassword(passwordEncoder.encode(request.password()));
        usuario.setEstado("activo");
        usuarioRepository.save(usuario);

        UsuarioRolId urId = new UsuarioRolId();
        urId.setIdUsuario(usuario.getId());
        urId.setIdRol(rol.getId());

        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(urId);
        usuarioRol.setIdUsuario(usuario);
        usuarioRol.setIdRol(rol);
        usuarioRolRepository.save(usuarioRol);

        return new RegisterUserResponse(
                usuario.getId(),
                usuario.getNombre() + " " + usuario.getApellidos(),
                usuario.getEmail(),
                rolNombre,
                "Usuario registrado correctamente"
        );
    }

    /** Devuelve todos los roles disponibles para el selector del formulario. */
    public List<Rol> listarRoles() {
        return rolRepository.findAll();
    }
}
