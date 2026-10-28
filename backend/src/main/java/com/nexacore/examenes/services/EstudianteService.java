package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.CarreraResponse;
import com.nexacore.examenes.dto.EstudianteListResponse;
import com.nexacore.examenes.dto.PageResponse;
import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.exceptions.EstudianteDuplicadoException;
import com.nexacore.examenes.models.Carrera;
import com.nexacore.examenes.models.CarreraId;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.models.EstudianteCarreraId;
import com.nexacore.examenes.repositories.CarreraRepository;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.models.CondicionEstudiante;
import com.nexacore.examenes.models.EstadoMatricula;
import com.nexacore.examenes.repositories.EstudianteFotoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.nexacore.examenes.dto.ActualizarEstudianteRequest;

import java.util.List;

@Service
public class EstudianteService {

    private static final int TAMANO_MAXIMO_PAGINA = 100;
    static final int BUSQUEDA_MAX = 40;

    private final EstudianteRepository estudianteRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;
    private final CarreraRepository carreraRepository;
    private final UsuarioRepository usuarioRepository;  
    private final EstudianteFotoRepository estudianteFotoRepository;
    private final QrEstudianteService qrEstudianteService;
    private final EmailService emailService;

    public EstudianteService(
            EstudianteRepository estudianteRepository,
            EstudianteCarreraRepository estudianteCarreraRepository,
            CarreraRepository carreraRepository,
            UsuarioRepository usuarioRepository,
            EstudianteFotoRepository estudianteFotoRepository,
            QrEstudianteService qrEstudianteService,
            EmailService emailService
    ) {
        this.estudianteRepository = estudianteRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
        this.carreraRepository = carreraRepository;
        this.usuarioRepository = usuarioRepository;  
        this.estudianteFotoRepository = estudianteFotoRepository;
        this.qrEstudianteService = qrEstudianteService;
        this.emailService = emailService;
    }

    /** Ruta de la foto en la API, o null si el estudiante no tiene. */
    public static String fotoUrl(Integer idEstudiante, boolean tieneFoto) {
        return tieneFoto ? "/estudiantes/" + idEstudiante + "/foto" : null;
    }

    public PageResponse<EstudianteListResponse> listar(
            int page, int size, String search, Integer idFacultad, Integer idCarrera
    ) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), TAMANO_MAXIMO_PAGINA));
        Page<Estudiante> pagina = estudianteRepository.buscarConFiltros(
                normalizarBusqueda(search), idFacultad, idCarrera, pageable
        );

        return PageResponse.de(pagina.map(this::toResponse));
    }

    static String normalizarBusqueda(String search) {
        if (search == null) {
            return null;
        }
        String criterio = search.strip().replaceAll("\\s+", " ");
        if (criterio.length() > BUSQUEDA_MAX) {
            throw new IllegalArgumentException(
                    "La búsqueda no puede superar los " + BUSQUEDA_MAX + " caracteres");
        }
        return criterio;
    }

    public List<CarreraResponse> listarCarreras(Integer idFacultad) {
        List<Carrera> carreras = (idFacultad != null)
                ? carreraRepository.findByIdIdFacultadOrderByNombreAsc(idFacultad)
                : carreraRepository.findAllByOrderByNombreAsc();

        return carreras.stream()
                .map(c -> new CarreraResponse(
                c.getId().getIdCarrera(),
                c.getNombre(),
                c.getCodigo(),
                c.getId().getIdFacultad(),
                c.getFacultad().getNombre()
        ))
                .toList();
    }

    @Transactional
    public EstudianteListResponse registrar(RegistrarEstudianteRequest request) {
        String codigoSis = limpiar(request.codigoSis());
        String ci = limpiar(request.ci());
        String email = limpiar(request.email()).toLowerCase();
        com.nexacore.examenes.dto.ReglasEstudiante.validarSisDistintoDeCi(codigoSis, ci);

        // BUG-A03: Validar duplicados en ESTUDIANTES
        if (estudianteRepository.existsByCodigoSisIgnoreCase(codigoSis)) {
            throw new EstudianteDuplicadoException("Ya existe un estudiante con ese código SIS.");
        }
        if (estudianteRepository.existsByCiIgnoreCase(ci)) {
            throw new EstudianteDuplicadoException("Ya existe un estudiante con ese CI.");
        }
        if (estudianteRepository.existsByEmailIgnoreCase(email)) {
            throw new EstudianteDuplicadoException("Ya existe un estudiante con ese correo electrónico.");
        }

        // BUG-A03: Validar duplicados también contra USUARIOS del sistema
        if (usuarioRepository.existsByCiIgnoreCase(ci)) {
            throw new EstudianteDuplicadoException("Ya existe un usuario del sistema con ese CI.");
        }
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new EstudianteDuplicadoException("Ya existe un usuario del sistema con ese correo electrónico.");
        }

        CarreraId carreraId = new CarreraId();
        carreraId.setIdCarrera(request.idCarrera());
        carreraId.setIdFacultad(request.idFacultad());
        Carrera carrera = carreraRepository.findById(carreraId)
                .orElseThrow(() -> new IllegalArgumentException("La carrera seleccionada no pertenece a la facultad indicada."));

        Estudiante estudiante = new Estudiante();
        estudiante.setNombre(limpiar(request.nombre()));
        estudiante.setApellidos(limpiar(request.apellidos()));
        estudiante.setCi(ci);
        estudiante.setEmail(email);
        estudiante.setCodigoSis(codigoSis);
        estudiante.setCondicion(CondicionEstudiante.normalizar(request.condicion(), CondicionEstudiante.REGULAR));
        
        // Unificado con la lógica de tu compañero (EstadoMatricula)
        estudiante.setTelefono(EstadoMatricula.normalizarTelefono(request.telefono(), null));
        estudiante.setEstadoMatricula(EstadoMatricula.normalizar(request.estadoMatricula(), EstadoMatricula.MATRICULADO));
        
        estudiante = estudianteRepository.saveAndFlush(estudiante);

        EstudianteCarreraId relacionId = new EstudianteCarreraId();
        relacionId.setIdEstudiante(estudiante.getId());
        relacionId.setIdCarrera(carrera.getId().getIdCarrera());
        relacionId.setIdFacultad(carrera.getId().getIdFacultad());

        EstudianteCarrera relacion = new EstudianteCarrera();
        relacion.setId(relacionId);
        relacion.setEstudiante(estudiante);
        relacion.setCarrera(carrera);
        estudianteCarreraRepository.save(relacion);
        // El QR ya no se envía al registrar: queda "Pendiente de activación" y le llega al activar su cuenta.

        return new EstudianteListResponse(
                estudiante.getId(), estudiante.getCodigoSis(), estudiante.getNombre(), estudiante.getApellidos(),
                estudiante.getCi(), estudiante.getTelefono(), estudiante.getEmail(), List.of(new EstudianteListResponse.CarreraInfo(
                carrera.getId().getIdCarrera(), carrera.getNombre(), carrera.getId().getIdFacultad(),
                carrera.getFacultad().getNombre()
        )), estudiante.getCondicion(), null,  estudiante.getEstadoMatricula(), false
        );
    }

    @Transactional
    public void regenerarYEnviarQr(Integer id) {
        Estudiante estudiante = estudianteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estudiante no encontrado con id: " + id));
        var qr = qrEstudianteService.regenerar(estudiante);
        emailService.enviarQrEstudiante(estudiante.getEmail(), estudiante.getNombre() + " " + estudiante.getApellidos(), estudiante.getCodigoSis(), qr.png());
    }

    public java.util.Optional<Estudiante> obtenerEntidad(Integer id) {
        return estudianteRepository.findById(id);
    }

    public EstudianteListResponse obtenerPorId(Integer id) {
        Estudiante e = estudianteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estudiante no encontrado con id: " + id));
        return toResponse(e);
    }

    @Transactional
    public EstudianteListResponse actualizar(Integer id, ActualizarEstudianteRequest request) {
        Estudiante e = estudianteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estudiante no encontrado con id: " + id));

        String nuevoCodigo = limpiar(request.codigoSis());
        String nuevoCi = limpiar(request.ci());
        String nuevoEmail = limpiar(request.email()).toLowerCase();
        com.nexacore.examenes.dto.ReglasEstudiante.validarSisDistintoDeCi(nuevoCodigo, nuevoCi);

        // Validar duplicados en ESTUDIANTES
        if (!e.getCodigoSis().equalsIgnoreCase(nuevoCodigo)
                && estudianteRepository.existsByCodigoSisIgnoreCase(nuevoCodigo)) {
            throw new EstudianteDuplicadoException("Ya existe un estudiante con ese código SIS.");
        }
        if (!e.getCi().equalsIgnoreCase(nuevoCi)
                && estudianteRepository.existsByCiIgnoreCase(nuevoCi)) {
            throw new EstudianteDuplicadoException("Ya existe un estudiante con ese CI.");
        }
        if (!nuevoEmail.isEmpty()
                && !nuevoEmail.equalsIgnoreCase(e.getEmail())
                && estudianteRepository.existsByEmailIgnoreCase(nuevoEmail)) {
            throw new EstudianteDuplicadoException("Ya existe un estudiante con ese correo electrónico.");
        }

        // BUG-A03: Validar duplicados también contra USUARIOS del sistema
        if (!e.getCi().equalsIgnoreCase(nuevoCi)
                && usuarioRepository.existsByCiIgnoreCase(nuevoCi)) {
            throw new EstudianteDuplicadoException("Ya existe un usuario del sistema con ese CI.");
        }
        if (!nuevoEmail.isEmpty()
                && !nuevoEmail.equalsIgnoreCase(e.getEmail())
                && usuarioRepository.existsByEmailIgnoreCase(nuevoEmail)) {
            throw new EstudianteDuplicadoException("Ya existe un usuario del sistema con ese correo electrónico.");
        }

        // Validar que la carrera pertenezca a la facultad
        CarreraId carreraId = new CarreraId();
        carreraId.setIdCarrera(request.idCarrera());
        carreraId.setIdFacultad(request.idFacultad());
        Carrera carrera = carreraRepository.findById(carreraId)
                .orElseThrow(() -> new IllegalArgumentException("La carrera seleccionada no pertenece a la facultad indicada."));

        // Actualizar datos personales
        e.setNombre(limpiar(request.nombre()));
        e.setApellidos(limpiar(request.apellidos()));
        e.setCodigoSis(nuevoCodigo);
        e.setCi(nuevoCi);
        e.setEmail(nuevoEmail.isEmpty() ? null : nuevoEmail);
        e.setCondicion(CondicionEstudiante.normalizar(request.condicion(), e.getCondicion()));
        
        // Unificado con la lógica de tu compañero (EstadoMatricula)
        e.setTelefono(EstadoMatricula.normalizarTelefono(request.telefono(), e.getTelefono()));
        e.setEstadoMatricula(EstadoMatricula.normalizar(request.estadoMatricula(), e.getEstadoMatricula()));
        
        estudianteRepository.saveAndFlush(e);
        sincronizarCuenta(e);

        // Reemplazar la carrera (borrar y volver a insertar)
        estudianteCarreraRepository.deleteByEstudianteId(id);

        EstudianteCarreraId relacionId = new EstudianteCarreraId();
        relacionId.setIdEstudiante(id);
        relacionId.setIdCarrera(carrera.getId().getIdCarrera());
        relacionId.setIdFacultad(carrera.getId().getIdFacultad());

        EstudianteCarrera relacion = new EstudianteCarrera();
        relacion.setId(relacionId);
        relacion.setEstudiante(e);
        relacion.setCarrera(carrera);
        estudianteCarreraRepository.save(relacion);

        return toResponse(e);
    }

    /**
     * Si el estudiante activó su cuenta, su usuario repite nombre, apellidos, CI y correo.
     */
    private void sincronizarCuenta(Estudiante e) {
        if (e.getIdUsuario() == null) return;
        usuarioRepository.findById(e.getIdUsuario()).ifPresent(usuario -> {
            usuario.setNombre(e.getNombre());
            usuario.setApellidos(e.getApellidos());
            usuario.setCi(e.getCi());
            usuario.setEmail(e.getEmail());
            usuarioRepository.save(usuario);
        });
    }

    private String limpiar(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private EstudianteListResponse toResponse(Estudiante e) {
        List<EstudianteCarrera> carreras = estudianteCarreraRepository
                .findByEstudianteId(e.getId());

        List<EstudianteListResponse.CarreraInfo> carrerasInfo = carreras.stream()
                .map(ec -> new EstudianteListResponse.CarreraInfo(
                ec.getCarrera().getId().getIdCarrera(),
                ec.getCarrera().getNombre(),
                ec.getCarrera().getId().getIdFacultad(),
                ec.getCarrera().getFacultad().getNombre()
        ))
                .toList();

        return new EstudianteListResponse(
                e.getId(),
                e.getCodigoSis(),
                e.getNombre(),
                e.getApellidos(),
                e.getCi(),
                e.getTelefono(),
                e.getEmail(),
                carrerasInfo,
                e.getCondicion(),
                fotoUrl(e.getId(), estudianteFotoRepository.existsById(e.getId())),
                e.getEstadoMatricula(),
                e.getIdUsuario() != null
        );
    }
}