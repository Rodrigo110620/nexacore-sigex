package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.MiExamenResponse;
import com.nexacore.examenes.dto.MiPerfilResponse;
import com.nexacore.examenes.dto.MiQrResponse;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteFoto;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.RegistroControlIngreso;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.RegistroControlIngresoRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * Panel del estudiante con cuenta (rol ESTUDIANTE). Todo se resuelve a partir de la sesión: el
 * estudiante solo ve y cambia lo suyo, nunca recibe un id de otro estudiante.
 */
@Service
public class PanelEstudianteService {

    public static final String RUTA_FOTO = "/mi/foto";

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final AsistenciaExamenRepository asistenciaRepository;
    private final RegistroControlIngresoRepository registroRepository;
    private final RepartoAulasService repartoAulasService;
    private final EstudianteFotoService fotoService;
    private final QrEstudianteService qrService;
    private final PasswordEncoder passwordEncoder;

    public PanelEstudianteService(UsuarioRepository usuarioRepository,
                                  EstudianteRepository estudianteRepository,
                                  EstudianteCarreraRepository estudianteCarreraRepository,
                                  AsistenciaExamenRepository asistenciaRepository,
                                  RegistroControlIngresoRepository registroRepository,
                                  RepartoAulasService repartoAulasService,
                                  EstudianteFotoService fotoService,
                                  QrEstudianteService qrService,
                                  PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.asistenciaRepository = asistenciaRepository;
        this.registroRepository = registroRepository;
        this.repartoAulasService = repartoAulasService;
        this.fotoService = fotoService;
        this.qrService = qrService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public MiPerfilResponse perfil(String email) {
        Estudiante e = estudianteDe(email);
        List<EstudianteListResponse.CarreraInfo> carreras = estudianteCarreraRepository.findByEstudianteId(e.getId())
                .stream()
                .map(ec -> new EstudianteListResponse.CarreraInfo(
                        ec.getCarrera().getId().getIdCarrera(),
                        ec.getCarrera().getNombre(),
                        ec.getCarrera().getId().getIdFacultad(),
                        ec.getCarrera().getFacultad().getNombre()))
                .toList();
        MiPerfilResponse.SolicitudFoto solicitud = fotoService.obtenerSolicitud(e.getId())
                .map(s -> new MiPerfilResponse.SolicitudFoto(s.getEstado(), s.getMotivoRechazo(), s.getEnviadaEn()))
                .orElse(null);
        return new MiPerfilResponse(
                e.getId(), e.getCodigoSis(), e.getNombre(), e.getApellidos(), enmascarar(e.getCi()), e.getEmail(),
                e.getTelefono(), e.getEstadoMatricula(), e.getCondicion(), carreras,
                fotoService.obtener(e.getId()).isPresent() ? RUTA_FOTO : null, solicitud);
    }

    @Transactional(readOnly = true)
    public Optional<EstudianteFoto> foto(String email) {
        return fotoService.obtener(estudianteDe(email).getId());
    }

    /** Pide confirmar la contraseña antes de enviar la foto, por si alguien usa la sesión abierta. */
    @Transactional
    public void solicitarCambioFoto(String email, String password, MultipartFile archivo) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Sesión no válida"));
        if (password == null || !passwordEncoder.matches(password, usuario.getPassword())) {
            throw new IllegalArgumentException("La contraseña no es correcta.");
        }
        fotoService.solicitarCambio(estudianteDe(email).getId(), archivo);
    }

    @Transactional(readOnly = true)
    public List<MiExamenResponse> examenes(String email) {
        Estudiante e = estudianteDe(email);
        return asistenciaRepository.listarDelEstudiante(e.getId()).stream()
                .map(a -> aExamen(e.getId(), a))
                .toList();
    }

    @Transactional
    public MiQrResponse qr(String email) {
        QrEstudianteService.QrTemporal qr = qrService.generarTemporal(estudianteDe(email));
        return new MiQrResponse(qr.contenido(), Base64.getEncoder().encodeToString(qr.png()), qr.expiraEn(),
                QrEstudianteService.SEGUNDOS_QR_TEMPORAL);
    }

    private MiExamenResponse aExamen(Integer idEstudiante, AsistenciaExamen a) {
        Examen ex = a.getExamen();
        Integer idExamen = a.getId().getIdExamen();
        Optional<RegistroControlIngreso> registro = registroRepository
                .findByIdIdEstudianteAndIdIdExamenOrderByFechaHoraDesc(idEstudiante, idExamen)
                .stream().findFirst();
        return new MiExamenResponse(
                idExamen,
                ex.getParalelo().getMateria().getNombre(),
                ex.getFecha(),
                ex.getHoraInicio(),
                ex.getDuracionMinutos(),
                aula(idEstudiante, a),
                a.getHabilitado(),
                Boolean.FALSE.equals(a.getHabilitado()) ? a.getMotivoInhabilitacion() : null,
                registro.map(RegistroControlIngreso::getResultadoAutorizacion).orElse(null),
                registro.map(RegistroControlIngreso::getMotivoDenegacion).orElse(null),
                a.getFechaHoraIngreso());
    }

    /**
     * Aula del estudiante: donde ingresó; si aún no ingresó, la que le toca por apellidos (o la
     * principal). Si el examen reparte por orden de llegada, null: se asigna en la puerta.
     */
    private String aula(Integer idEstudiante, AsistenciaExamen a) {
        if (a.getAmbienteIngreso() != null) {
            return a.getAmbienteIngreso().getNombre();
        }
        Examen ex = a.getExamen();
        if (ex.repartePorLlegada()) {
            return null;
        }
        RepartoAulasService.Aula aula = repartoAulasService.repartir(ex,
                asistenciaRepository.listarDelExamen(a.getId().getIdExamen(), a.getIdParalelo())).aulaDe(idEstudiante);
        if (aula != null && aula.nombre() != null) {
            return aula.nombre();
        }
        return ex.getAmbiente() != null ? ex.getAmbiente().getNombre() : null;
    }

    /** Estudiante dueño de la sesión. Un usuario sin estudiante ligado no tiene panel. */
    private Estudiante estudianteDe(String email) {
        return usuarioRepository.findByEmail(email)
                .flatMap(u -> estudianteRepository.findByIdUsuario(u.getId()))
                .orElseThrow(() -> new AccessDeniedException("Esta cuenta no pertenece a un estudiante."));
    }

    /** Solo los 3 últimos dígitos: ••••210. */
    static String enmascarar(String ci) {
        if (ci == null || ci.length() <= 3) {
            return "•••";
        }
        return "•".repeat(ci.length() - 3) + ci.substring(ci.length() - 3);
    }
}
