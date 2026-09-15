package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.dto.UsuarioListResponse;
import com.nexacore.examenes.exceptions.EmailDuplicadoException;
import com.nexacore.examenes.exceptions.RolInvalidoException;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.UsuarioRolRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

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
    private static final int TAMANO_MAXIMO_PAGINA = 100;
    private static final String SIN_ROL = "SIN_ROL";

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

    /**
     * Lista los usuarios registrados de forma paginada, ordenados por nombre ascendente
     * (tarea B1), con búsqueda y filtros opcionales combinables (tarea B2).
     *
     * Valores fuera de rango se ajustan en lugar de fallar:
     * page negativo pasa a 0 y size queda entre 1 y 100.
     *
     * Los filtros null o en blanco no se aplican. El filtrado ocurre en la base de datos.
     * El mapeo a DTO ocurre dentro de la transacción porque usuarioRoles es LAZY.
     *
     * @param search texto parcial a buscar en nombre, apellidos, email o CI (sin distinguir mayúsculas)
     * @param rol    ADMIN, DOCENTE o CONTROL (sin distinguir mayúsculas)
     * @param estado activo o inactivo (sin distinguir mayúsculas)
     */
    @Transactional(readOnly = true)
    public PageResponse<UsuarioListResponse> listar(int page, int size, String search, String rol, String estado) {
        int paginaValida = Math.max(page, 0);
        int tamanoValido = Math.min(Math.max(size, 1), TAMANO_MAXIMO_PAGINA);

        PageRequest pageable = PageRequest.of(paginaValida, tamanoValido, Sort.by("nombre").ascending());

        Page<Usuario> usuarios = usuarioRepository.buscar(
                escaparComodinesLike(normalizar(search).toLowerCase(Locale.ROOT)),
                normalizar(rol).toUpperCase(Locale.ROOT),
                normalizar(estado).toLowerCase(Locale.ROOT),
                pageable);

        return PageResponse.de(usuarios.map(this::aListResponse));
    }

    /** Convierte null o texto en blanco a cadena vacía, que la consulta interpreta como "sin filtro". */
    private String normalizar(String valor) {
        return valor == null ? "" : valor.trim();
    }

    /** Escapa \, % y _ para que el texto buscado se compare literalmente y no como comodín de LIKE. */
    private String escaparComodinesLike(String valor) {
        return valor.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    /** Convierte la entidad al DTO del listado, sin exponer el password. */
    private UsuarioListResponse aListResponse(Usuario usuario) {
        return new UsuarioListResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellidos(),
                usuario.getEmail(),
                obtenerPrimerRol(usuario),
                usuario.getEstado()
        );
    }

    /** Devuelve el nombre del primer rol del usuario, o "SIN_ROL" si no tiene ninguno. */
    private String obtenerPrimerRol(Usuario usuario) {
        if (usuario.getUsuarioRoles() == null) {
            return SIN_ROL;
        }
        return usuario.getUsuarioRoles().stream()
                .map(UsuarioRol::getIdRol)
                .filter(Objects::nonNull)
                .map(Rol::getNombre)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(SIN_ROL);
    }
}
