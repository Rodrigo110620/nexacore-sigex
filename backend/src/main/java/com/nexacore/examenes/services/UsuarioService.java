package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.CrearRolRequest;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegisterUserRequest;
import com.nexacore.examenes.dto.RegisterUserResponse;
import com.nexacore.examenes.dto.UsuarioListResponse;
import com.nexacore.examenes.dto.UsuarioStatsResponse;
import com.nexacore.examenes.exceptions.EmailDuplicadoException;
import com.nexacore.examenes.exceptions.RolDuplicadoException;
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
import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
/**
 * Lógica de negocio para la gestión de usuarios.
 *
 * Orden de validaciones en registrar():
 *   1. Rol válido  → 400 si no es ADMIN/DOCENTE/CONTROL
 *   2. Email único → 409 si ya existe
 *   3. Guardar usuario con password hasheado + asignar rol
 */
@Service
public class UsuarioService {
    private static final int TAMANO_MAXIMO_PAGINA = 100;
    private static final String SIN_ROL = "SIN_ROL";
    private static final String CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          UsuarioRolRepository usuarioRolRepository,
                          PasswordEncoder passwordEncoder,
                          EmailService emailService) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
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
        // Valida contra la BD: si el rol no existe en la tabla rol → 400.
        // No hay lista fija: cualquier rol que se inserte en BD pasa a ser válido.
        Rol rol = rolRepository.findByNombre(rolNombre)
                .orElseThrow(() -> new RolInvalidoException(rolNombre));
        if (usuarioRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailDuplicadoException(request.email());
        }
        String passwordTemporal = generarPasswordTemporal();
        Usuario usuario = new Usuario();
        usuario.setNombre(normalizarNombre(request.nombre()));
        usuario.setApellidos(normalizarNombre(request.apellidos()));
        usuario.setCi(request.ci());
        usuario.setEmail(request.email());
        usuario.setPassword(passwordEncoder.encode(passwordTemporal));
        usuario.setEstado(Boolean.TRUE.equals(request.activo()) ? "activo" : "inactivo");
        usuarioRepository.save(usuario);
        UsuarioRolId urId = new UsuarioRolId();
        urId.setIdUsuario(usuario.getId());
        urId.setIdRol(rol.getId());
        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(urId);
        usuarioRol.setIdUsuario(usuario);
        usuarioRol.setIdRol(rol);
        usuarioRolRepository.save(usuarioRol);
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellidos();
        // La clave provisional solo se envía por correo; nunca se devuelve en la respuesta HTTP.
        emailService.enviarPasswordTemporal(usuario.getEmail(), nombreCompleto, passwordTemporal);
        return new RegisterUserResponse(
                usuario.getId(),
                nombreCompleto,
                usuario.getEmail(),
                rolNombre,
                null,
                "Usuario registrado. Credenciales enviadas por correo."
        );
    }
    /**
     * Actualiza los datos de un usuario existente.
     */
    @Transactional
    public RegisterUserResponse actualizar(Integer id, RegisterUserRequest request) {
        // 1. Buscar el usuario existente (Ya recibe Integer correctamente)
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
        // 2. Validar si el correo cambió y si ya pertenece a otro usuario
        if (!usuario.getEmail().equalsIgnoreCase(request.email())) {
            if (usuarioRepository.findByEmail(request.email()).isPresent()) {
                throw new EmailDuplicadoException(request.email());
            }
        }
        // 3. Validar el rol
        String rolNombre = request.rol().toUpperCase();
        Rol rol = rolRepository.findByNombre(rolNombre)
                .orElseThrow(() -> new RolInvalidoException(rolNombre));
        // 4. Actualizar campos personales y de estado (nombre/apellidos en formato Título)
        usuario.setNombre(normalizarNombre(request.nombre()));
        usuario.setApellidos(normalizarNombre(request.apellidos()));
        usuario.setCi(request.ci());
        usuario.setEmail(request.email());
        usuario.setEstado(Boolean.TRUE.equals(request.activo()) ? "activo" : "inactivo");
        usuarioRepository.save(usuario);
        // 5. Borrar el rol antiguo antes de asignar el nuevo
        usuarioRolRepository.deleteByUsuarioId(id); 
        // 6. Asignar el nuevo rol actualizado
        UsuarioRolId urId = new UsuarioRolId();
        urId.setIdUsuario(usuario.getId());
        urId.setIdRol(rol.getId());
        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(urId);
        usuarioRol.setIdUsuario(usuario);
        usuarioRol.setIdRol(rol);
        usuarioRolRepository.save(usuarioRol);
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellidos();
        return new RegisterUserResponse(
                usuario.getId(),
                nombreCompleto,
                usuario.getEmail(),
                rolNombre,
                null,
                "Usuario actualizado correctamente"
        );
    }
    /** Devuelve todos los roles disponibles para el selector del formulario. */
    public List<Rol> listarRoles() {
        return rolRepository.findAll();
    }
    /**
     * Crea un nuevo rol en el sistema.
     *
     * @throws RolDuplicadoException si ya existe un rol con ese nombre
     */
    @Transactional
    public Rol crearRol(CrearRolRequest request) {
        String nombre = request.nombre().toUpperCase();
        if (rolRepository.findByNombre(nombre).isPresent()) {
            throw new RolDuplicadoException(nombre);
        }
        Rol rol = new Rol();
        rol.setNombre(nombre);
        return rolRepository.save(rol);
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
                usuario.getCi(),
                obtenerPrimerRol(usuario),
                usuario.getEstado()
        );
    }
    /**
     * Genera una contraseña provisional de 10 caracteres usando SecureRandom.
     * Excluye caracteres ambiguos (0/O, 1/l/I) para facilitar la lectura.
     */
    private String generarPasswordTemporal() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(CARACTERES.charAt(RANDOM.nextInt(CARACTERES.length())));
        }
        return sb.toString();
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
    /**
     * Devuelve las estadísticas agregadas de usuarios del sistema.
     */
    @Transactional(readOnly = true)
    public UsuarioStatsResponse obtenerEstadisticas() {
        long total = usuarioRepository.count();
        long administradores = usuarioRepository.countByRolNombre("ADMIN");
        long docentes = usuarioRepository.countByRolNombre("DOCENTE");
        long personalControl = usuarioRepository.countByRolNombre("CONTROL");
        long activos = usuarioRepository.countByEstado("activo");
        long inactivos = usuarioRepository.countByEstado("inactivo");
        return new UsuarioStatsResponse(
                total,
                administradores,
                docentes,
                personalControl,
                activos,
                inactivos
        );
    }

    /**
     * Guarda nombres y apellidos en formato Título (ej. Rodrigo Figueroa).
     * Elimina espacios extremos, colapsa espacios dobles y rechaza la misma letra repetida.
     */
    private static String normalizarNombre(String valor) {
        if (valor == null) {
            return null;
        }
        Locale locale = Locale.forLanguageTag("es-BO");
        String normalizado = aFormatoTitulo(
                valor.trim().replaceAll("\\s{2,}", " "),
                locale);
        String soloLetras = normalizado.replaceAll("[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", "");
        if (soloLetras.length() >= 2) {
            String upper = soloLetras.toUpperCase(locale);
            char primera = upper.charAt(0);
            boolean mismaLetra = true;
            for (int i = 1; i < upper.length(); i++) {
                if (upper.charAt(i) != primera) {
                    mismaLetra = false;
                    break;
                }
            }
            if (mismaLetra) {
                throw new IllegalArgumentException(
                        "El nombre o apellido no puede ser la misma letra repetida");
            }
        }
        return normalizado;
    }

    /** Primera letra mayúscula y resto minúsculas por palabra (respeta ' y -). */
    private static String aFormatoTitulo(String valor, Locale locale) {
        StringBuilder out = new StringBuilder(valor.length());
        boolean nuevaPalabra = true;
        for (int i = 0; i < valor.length(); ) {
            int cp = valor.codePointAt(i);
            i += Character.charCount(cp);
            if (cp == ' ' || cp == '\'' || cp == '-') {
                out.appendCodePoint(cp);
                nuevaPalabra = true;
                continue;
            }
            String ch = new String(Character.toChars(cp));
            if (nuevaPalabra) {
                out.append(ch.toUpperCase(locale));
                nuevaPalabra = false;
            } else {
                out.append(ch.toLowerCase(locale));
            }
        }
        return out.toString();
    }
}