package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ConfirmarActivacionRequest;
import com.nexacore.examenes.dto.SolicitarActivacionRequest;
import com.nexacore.examenes.utils.ValidacionIdentificador;
import com.nexacore.examenes.dto.VerificarCodigoActivacionRequest;
import com.nexacore.examenes.exceptions.PasswordConfirmacionException;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteActivacion;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import com.nexacore.examenes.repositories.EstudianteActivacionRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.UsuarioRolRepository;
import com.nexacore.examenes.security.PasswordPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * Activación de la cuenta del estudiante (CTA-01). El estudiante ya está registrado por la
 * administración; aquí solo demuestra que es él (código SIS + CI + correo institucional y un código
 * enviado a ese correo) y elige su contraseña. Con eso se crea su usuario con el rol ESTUDIANTE.
 */
@Service
public class CuentaEstudianteService {

    static final int MINUTOS_CODIGO = 10;
    static final int MAX_INTENTOS = 5;
    /** Evita reenviar el correo en ráfaga si el estudiante pide otro código enseguida. */
    static final int SEGUNDOS_ENTRE_ENVIOS = 60;
    static final String CODIGO_INVALIDO = "El código es incorrecto o venció. Pide uno nuevo.";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EstudianteRepository estudianteRepository;
    private final EstudianteActivacionRepository activacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public CuentaEstudianteService(EstudianteRepository estudianteRepository,
                                   EstudianteActivacionRepository activacionRepository,
                                   UsuarioRepository usuarioRepository,
                                   RolRepository rolRepository,
                                   UsuarioRolRepository usuarioRolRepository,
                                   PasswordEncoder passwordEncoder,
                                   EmailService emailService) {
        this.estudianteRepository = estudianteRepository;
        this.activacionRepository = activacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /** Código de verificación inválido, vencido o agotado. Siempre con el mismo mensaje. */
    public static class CodigoActivacionInvalidoException extends IllegalArgumentException {
        public CodigoActivacionInvalidoException() {
            super(CODIGO_INVALIDO);
        }
    }

    /**
     * Paso 1. Si los tres datos coinciden con un estudiante sin cuenta, envía un código de 6 dígitos
     * a su correo. Siempre termina igual, para no revelar qué estudiantes existen o ya tienen cuenta.
     */
    @Transactional
    public void solicitarActivacion(SolicitarActivacionRequest request) {
        // BUG-E01/E02 de HU#5: un código SIS o C.I. ficticio (444444444, 123456789) no pasa al paso 2.
        // Solo mira el formato, así que no revela qué estudiantes existen.
        ValidacionIdentificador.validarCodigoUniversitario(request.codigoSis().strip());
        ValidacionIdentificador.validarCiNoFicticio(request.ci().strip());
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        Optional<Estudiante> encontrado = estudianteRepository.findByCodigoSis(request.codigoSis().strip())
                .filter(e -> e.getIdUsuario() == null)
                .filter(e -> e.getCi().equals(request.ci().strip()))
                .filter(e -> e.getEmail() != null && e.getEmail().equalsIgnoreCase(email))
                .filter(e -> usuarioRepository.findByEmail(email).isEmpty());
        if (encontrado.isEmpty()) {
            return;
        }
        Estudiante estudiante = encontrado.get();
        LocalDateTime ahora = LocalDateTime.now();
        Optional<EstudianteActivacion> anterior = activacionRepository.findById(estudiante.getId());
        if (anterior.isPresent() && anterior.get().getCreadoEn().plusSeconds(SEGUNDOS_ENTRE_ENVIOS).isAfter(ahora)) {
            return;
        }
        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
        EstudianteActivacion activacion = anterior.orElseGet(EstudianteActivacion::new);
        activacion.setIdEstudiante(estudiante.getId());
        activacion.setHashCodigo(hash(estudiante.getId(), codigo));
        activacion.setExpiraEn(ahora.plusMinutes(MINUTOS_CODIGO));
        activacion.setIntentos(0);
        activacion.setCreadoEn(ahora);
        activacionRepository.save(activacion);
        emailService.enviarCodigoActivacion(estudiante.getEmail(),
                estudiante.getNombre() + " " + estudiante.getApellidos(), codigo, MINUTOS_CODIGO);
    }

    /**
     * Paso 2. Con el código correcto crea el usuario del estudiante (rol ESTUDIANTE) con la
     * contraseña elegida. Cada código fallido cuenta; tras MAX_INTENTOS hay que pedir otro.
     * El contador se guarda aunque se lance la excepción (noRollbackFor).
     */
    @Transactional(noRollbackFor = CodigoActivacionInvalidoException.class)
    public void confirmarActivacion(ConfirmarActivacionRequest request) {
        String password = request.passwordNueva();
        PasswordPolicy.validate(password);
        if (!password.equals(request.passwordConfirmacion())) {
            throw new PasswordConfirmacionException();
        }

        Estudiante estudiante = estudianteRepository.findByCodigoSis(request.codigoSis().strip())
                .filter(e -> e.getIdUsuario() == null)
                .orElseThrow(CodigoActivacionInvalidoException::new);
        EstudianteActivacion activacion = comprobarCodigo(estudiante, request.codigo());

        PasswordPolicy.validarSinDatosDelEstudiante(password, estudiante.getCodigoSis(), estudiante.getCi(), estudiante.getNombre());
        // El correo del usuario se guarda en minúsculas (V25).
        if (usuarioRepository.findByEmail(estudiante.getEmail().toLowerCase(Locale.ROOT)).isPresent()
                || usuarioRepository.existsByCi(estudiante.getCi())) {
            throw new IllegalArgumentException(
                    "Ya existe una cuenta con tu correo o tu CI. Comunícate con la administración.");
        }
        Rol rolEstudiante = rolRepository.findByNombre(Rol.ESTUDIANTE)
                .orElseThrow(() -> new IllegalStateException("Falta el rol ESTUDIANTE (migración V31)."));

        Usuario usuario = new Usuario();
        usuario.setNombre(estudiante.getNombre());
        usuario.setApellidos(estudiante.getApellidos());
        usuario.setCi(estudiante.getCi());
        usuario.setEmail(estudiante.getEmail().toLowerCase(Locale.ROOT));
        usuario.setPassword(passwordEncoder.encode(password));
        usuario.setEstado("activo");
        usuarioRepository.saveAndFlush(usuario);

        // Primero se liga la cuenta y después el rol: la base solo acepta el rol ESTUDIANTE en
        // un usuario que ya es la cuenta de un estudiante.
        estudiante.setIdUsuario(usuario.getId());
        estudianteRepository.saveAndFlush(estudiante);

        UsuarioRolId id = new UsuarioRolId();
        id.setIdUsuario(usuario.getId());
        id.setIdRol(rolEstudiante.getId());
        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(id);
        usuarioRol.setIdUsuario(usuario);
        usuarioRol.setIdRol(rolEstudiante);
        usuarioRolRepository.save(usuarioRol);

        activacionRepository.delete(activacion);
    }

    /**
     * Paso 2 (BUG-E03 de HU#5): comprueba el código sin usarlo, para no pasar a la contraseña con un
     * código falso. Cada código fallido cuenta igual que al confirmar (mismo límite de intentos).
     */
    @Transactional(noRollbackFor = CodigoActivacionInvalidoException.class)
    public void verificarCodigo(VerificarCodigoActivacionRequest request) {
        Estudiante estudiante = estudianteRepository.findByCodigoSis(request.codigoSis().strip())
                .filter(e -> e.getIdUsuario() == null)
                .orElseThrow(CodigoActivacionInvalidoException::new);
        comprobarCodigo(estudiante, request.codigo());
    }

    /** El registro de activación si el código es correcto y vigente; si no, suma un intento y lanza. */
    private EstudianteActivacion comprobarCodigo(Estudiante estudiante, String codigo) {
        EstudianteActivacion activacion = activacionRepository.findById(estudiante.getId())
                .orElseThrow(CodigoActivacionInvalidoException::new);
        if (activacion.getIntentos() >= MAX_INTENTOS || activacion.getExpiraEn().isBefore(LocalDateTime.now())) {
            throw new CodigoActivacionInvalidoException();
        }
        boolean coincide = MessageDigest.isEqual(
                activacion.getHashCodigo().getBytes(StandardCharsets.US_ASCII),
                hash(estudiante.getId(), codigo.strip()).getBytes(StandardCharsets.US_ASCII));
        if (!coincide) {
            activacion.setIntentos(activacion.getIntentos() + 1);
            activacionRepository.save(activacion);
            throw new CodigoActivacionInvalidoException();
        }
        return activacion;
    }

    private static String hash(Integer idEstudiante, String codigo) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((idEstudiante + ":" + codigo).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
