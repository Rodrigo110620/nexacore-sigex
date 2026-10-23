package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.FotoPendienteResponse;
import com.nexacore.examenes.dto.ReportarFotoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteFoto;
import com.nexacore.examenes.models.EstudianteFotoSolicitud;
import com.nexacore.examenes.models.ReporteFoto;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteFotoRepository;
import com.nexacore.examenes.repositories.EstudianteFotoSolicitudRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ReporteFotoRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Fotografía del estudiante que se muestra al identificarlo y en el control de ingreso (ACCS-01/02/03). */
@Service
public class EstudianteFotoService {

    /**
     * Tope del servidor. El frontend reduce la foto a 400 px (unos 25–45 KB); el tope impide que se
     * guarden imágenes grandes en la base de datos si alguien sube el archivo sin pasar por el formulario.
     */
    public static final int TAMANO_MAXIMO = 150 * 1024;

    private final EstudianteFotoRepository fotoRepository;
    private final EstudianteRepository estudianteRepository;
    private final EstudianteFotoSolicitudRepository solicitudRepository;
    private final ReporteFotoRepository reporteRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteCarreraRepository estudianteCarreraRepository;

    public EstudianteFotoService(EstudianteFotoRepository fotoRepository, EstudianteRepository estudianteRepository,
                                 EstudianteFotoSolicitudRepository solicitudRepository,
                                 ReporteFotoRepository reporteRepository, UsuarioRepository usuarioRepository,
                                 EstudianteCarreraRepository estudianteCarreraRepository) {
        this.fotoRepository = fotoRepository;
        this.estudianteRepository = estudianteRepository;
        this.solicitudRepository = solicitudRepository;
        this.reporteRepository = reporteRepository;
        this.usuarioRepository = usuarioRepository;
        this.estudianteCarreraRepository = estudianteCarreraRepository;
    }

    /**
     * Guarda o reemplaza la foto. El tipo se decide por el contenido del archivo, no por su nombre
     * ni por el Content-Type que manda el navegador.
     */
    @Transactional
    public void guardar(Integer idEstudiante, MultipartFile archivo) {
        verificarEstudiante(idEstudiante);
        byte[] contenido = leerImagen(archivo);
        guardarAprobada(idEstudiante, contenido, tipoDeImagen(contenido).orElseThrow());
    }

    private void guardarAprobada(Integer idEstudiante, byte[] contenido, String tipo) {
        EstudianteFoto foto = fotoRepository.findById(idEstudiante).orElseGet(EstudianteFoto::new);
        foto.setIdEstudiante(idEstudiante);
        foto.setContenido(contenido);
        foto.setTipoContenido(tipo);
        foto.setActualizadoEn(LocalDateTime.now());
        fotoRepository.save(foto);
    }

    /** Lee el archivo y comprueba tamaño y tipo real de imagen. */
    private static byte[] leerImagen(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Selecciona una fotografía.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new IllegalArgumentException("La fotografía no puede superar 150 KB.");
        }
        byte[] contenido;
        try {
            contenido = archivo.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo leer la fotografía.");
        }
        if (tipoDeImagen(contenido).isEmpty()) {
            throw new IllegalArgumentException("La fotografía debe ser una imagen JPG, PNG o WEBP.");
        }
        return contenido;
    }

    /**
     * Foto enviada por el propio estudiante (CTA-02). Si todavía no tiene foto aprobada, esta pasa a
     * ser su foto en el acto: la registra el dueño de una cuenta ya verificada. Si ya tenía una, o si
     * su foto fue reportada por el personal de control, queda PENDIENTE y no reemplaza a la que ve el
     * personal de control hasta que la administración la apruebe.
     *
     * @return true si la foto quedó aprobada; false si queda pendiente de revisión.
     */
    @Transactional
    public boolean enviarDelEstudiante(Integer idEstudiante, MultipartFile archivo) {
        verificarEstudiante(idEstudiante);
        byte[] contenido = leerImagen(archivo);
        boolean reportada = reporteAbierto(idEstudiante).isPresent();
        if (fotoRepository.findById(idEstudiante).isEmpty() && !reportada) {
            guardarAprobada(idEstudiante, contenido, tipoDeImagen(contenido).orElseThrow());
            solicitudRepository.findById(idEstudiante).ifPresent(solicitudRepository::delete);
            return true;
        }
        solicitarCambio(idEstudiante, contenido,
                reportada ? EstudianteFotoSolicitud.REPORTE : EstudianteFotoSolicitud.CAMBIO);
        return false;
    }

    /** Un cambio de foto queda PENDIENTE; uno nuevo reemplaza al anterior. */
    private void solicitarCambio(Integer idEstudiante, byte[] contenido, String origen) {
        EstudianteFotoSolicitud solicitud = solicitudRepository.findById(idEstudiante)
                .orElseGet(EstudianteFotoSolicitud::new);
        solicitud.setIdEstudiante(idEstudiante);
        solicitud.setContenido(contenido);
        solicitud.setTipoContenido(tipoDeImagen(contenido).orElseThrow());
        solicitud.setEstado(EstudianteFotoSolicitud.PENDIENTE);
        solicitud.setOrigen(origen);
        solicitud.setMotivoRechazo(null);
        solicitud.setEnviadaEn(LocalDateTime.now());
        solicitud.setRevisadaEn(null);
        solicitudRepository.save(solicitud);
    }

    /** Cambio de foto de un estudiante que ya tiene una aprobada (lo usa también la administración en pruebas). */
    @Transactional
    public void solicitarCambio(Integer idEstudiante, MultipartFile archivo) {
        verificarEstudiante(idEstudiante);
        solicitarCambio(idEstudiante, leerImagen(archivo), EstudianteFotoSolicitud.CAMBIO);
    }

    @Transactional(readOnly = true)
    public Optional<EstudianteFotoSolicitud> obtenerSolicitud(Integer idEstudiante) {
        return solicitudRepository.findById(idEstudiante);
    }

    @Transactional(readOnly = true)
    public List<EstudianteFotoSolicitud> listarPendientes() {
        return solicitudRepository.findByEstadoOrderByEnviadaEnAsc(EstudianteFotoSolicitud.PENDIENTE);
    }

    /** La foto pendiente pasa a ser la foto del estudiante y cierra el reporte que la motivó, si lo hay. */
    @Transactional
    public void aprobarSolicitud(Integer idEstudiante) {
        EstudianteFotoSolicitud solicitud = solicitudPendiente(idEstudiante);
        guardarAprobada(idEstudiante, solicitud.getContenido(), solicitud.getTipoContenido());
        solicitudRepository.delete(solicitud);
        reporteAbierto(idEstudiante).ifPresent(r -> cerrar(r, ReporteFoto.APROBADA));
    }

    /**
     * El personal de control reporta que la foto no coincide con la persona. El estudiante deberá
     * volver a escanear su rostro y la administración revisará la nueva foto. No autoriza ni
     * deniega el ingreso en curso.
     */
    @Transactional
    public void reportar(Integer idEstudiante, ReportarFotoRequest request, String emailPersonal) {
        verificarEstudiante(idEstudiante);
        if (fotoRepository.findById(idEstudiante).isEmpty()) {
            throw new IllegalArgumentException("El estudiante no tiene una foto registrada para reportar.");
        }
        if (reporteAbierto(idEstudiante).isPresent()) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "La foto de este estudiante ya fue reportada y está en revisión.");
        }
        Usuario personal = usuarioRepository.findByEmail(emailPersonal)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró al usuario que reporta."));
        ReporteFoto reporte = new ReporteFoto();
        reporte.setIdEstudiante(idEstudiante);
        reporte.setIdUsuario(personal.getId());
        reporte.setIdExamen(request.idExamen());
        reporte.setMotivo(request.motivo().name());
        reporte.setDetalle(request.detalle() == null || request.detalle().isBlank() ? null : request.detalle().strip());
        reporte.setCreadoEn(LocalDateTime.now());
        reporteRepository.save(reporte);
    }

    /** La administración comprueba que la foto vigente sí es correcta: el estudiante ya no debe reemplazarla. */
    @Transactional
    public void descartarReporte(Integer idEstudiante) {
        ReporteFoto reporte = reporteAbierto(idEstudiante)
                .orElseThrow(() -> new IllegalArgumentException("La foto de este estudiante no tiene un reporte abierto."));
        cerrar(reporte, ReporteFoto.DESCARTADO);
        // Si ya había enviado una foto por el reporte, queda como un cambio común para revisar.
        solicitudRepository.findById(idEstudiante)
                .filter(s -> EstudianteFotoSolicitud.REPORTE.equals(s.getOrigen()))
                .ifPresent(s -> {
                    s.setOrigen(EstudianteFotoSolicitud.CAMBIO);
                    solicitudRepository.save(s);
                });
    }

    @Transactional(readOnly = true)
    public Optional<ReporteFoto> reporteAbierto(Integer idEstudiante) {
        return reporteRepository.findFirstByIdEstudianteAndEstado(idEstudiante, ReporteFoto.ABIERTO);
    }

    private void cerrar(ReporteFoto reporte, String resolucion) {
        reporte.setEstado(ReporteFoto.RESUELTO);
        reporte.setResolucion(resolucion);
        reporte.setResueltoEn(LocalDateTime.now());
        reporteRepository.save(reporte);
    }

    /**
     * Revisión de fotos del ADMIN, de la más antigua a la más reciente: cambios pendientes y fotos
     * reportadas por el personal de control (con la foto nueva o esperando que el estudiante la envíe).
     */
    @Transactional(readOnly = true)
    public List<FotoPendienteResponse> listarRevision() {
        Map<Integer, EstudianteFotoSolicitud> pendientes = listarPendientes().stream()
                .collect(Collectors.toMap(EstudianteFotoSolicitud::getIdEstudiante, Function.identity()));
        Map<Integer, ReporteFoto> reportes = reporteRepository.findByEstadoOrderByCreadoEnAsc(ReporteFoto.ABIERTO).stream()
                .collect(Collectors.toMap(ReporteFoto::getIdEstudiante, Function.identity(), (a, b) -> a));
        Set<Integer> ids = new HashSet<>(pendientes.keySet());
        ids.addAll(reportes.keySet());
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Integer, Estudiante> estudiantes = estudianteRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Map<Integer, String> carreras = estudianteCarreraRepository.findByEstudianteIds(ids).stream()
                .collect(Collectors.groupingBy(ec -> ec.getId().getIdEstudiante(),
                        Collectors.mapping(ec -> ec.getCarrera().getNombre(),
                                Collectors.collectingAndThen(Collectors.toCollection(TreeSet::new),
                                        nombres -> String.join(", ", nombres)))));
        Set<Integer> conFoto = new HashSet<>(fotoRepository.findAllById(ids).stream()
                .map(EstudianteFoto::getIdEstudiante).toList());
        Map<Integer, String> personal = usuarioRepository.findAllById(
                        reportes.values().stream().map(ReporteFoto::getIdUsuario).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombre() + " " + u.getApellidos()));

        List<FotoPendienteResponse> lista = new ArrayList<>();
        for (Integer id : ids) {
            Estudiante e = estudiantes.get(id);
            if (e == null) {
                continue;
            }
            EstudianteFotoSolicitud solicitud = pendientes.get(id);
            ReporteFoto reporte = reportes.get(id);
            lista.add(new FotoPendienteResponse(
                    id, e.getCodigoSis(), e.getNombre(), e.getApellidos(), carreras.get(id),
                    reporte != null ? EstudianteFotoSolicitud.REPORTE : EstudianteFotoSolicitud.CAMBIO,
                    solicitud != null ? FotoPendienteResponse.PENDIENTE : FotoPendienteResponse.ESPERANDO_FOTO,
                    solicitud != null ? solicitud.getEnviadaEn() : null,
                    solicitud != null ? "/estudiantes/" + id + "/foto-solicitud" : null,
                    conFoto.contains(id) ? "/estudiantes/" + id + "/foto" : null,
                    reporte == null ? null : new FotoPendienteResponse.Reporte(reporte.getMotivo(),
                            reporte.getDetalle(), personal.get(reporte.getIdUsuario()), reporte.getCreadoEn())));
        }
        // Más antiguas primero: la fecha del envío o, si aún no hay foto nueva, la del reporte.
        lista.sort(Comparator.comparing(f -> f.enviadaEn() != null ? f.enviadaEn() : f.reporte().reportadoEn()));
        return lista;
    }

    /** La foto actual no cambia; el estudiante ve el motivo y puede enviar otra. */
    @Transactional
    public void rechazarSolicitud(Integer idEstudiante, String motivo) {
        EstudianteFotoSolicitud solicitud = solicitudPendiente(idEstudiante);
        solicitud.setEstado(EstudianteFotoSolicitud.RECHAZADA);
        solicitud.setMotivoRechazo(motivo.strip());
        solicitud.setRevisadaEn(LocalDateTime.now());
        solicitudRepository.save(solicitud);
    }

    private EstudianteFotoSolicitud solicitudPendiente(Integer idEstudiante) {
        return solicitudRepository.findById(idEstudiante)
                .filter(s -> EstudianteFotoSolicitud.PENDIENTE.equals(s.getEstado()))
                .orElseThrow(() -> new IllegalArgumentException("El estudiante no tiene una foto pendiente de aprobación."));
    }

    @Transactional(readOnly = true)
    public Optional<EstudianteFoto> obtener(Integer idEstudiante) {
        return fotoRepository.findById(idEstudiante);
    }

    @Transactional
    public void eliminar(Integer idEstudiante) {
        verificarEstudiante(idEstudiante);
        if (fotoRepository.existsById(idEstudiante)) {
            fotoRepository.deleteById(idEstudiante);
        }
    }

    private void verificarEstudiante(Integer idEstudiante) {
        if (!estudianteRepository.existsById(idEstudiante)) {
            throw new IllegalArgumentException("Estudiante no encontrado con id: " + idEstudiante);
        }
    }

    /** JPEG (FF D8 FF), PNG (89 50 4E 47) o WEBP (RIFF....WEBP), según los primeros bytes. */
    public static Optional<String> tipoDeImagen(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return Optional.of("image/jpeg");
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return Optional.of("image/png");
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return Optional.of("image/webp");
        }
        return Optional.empty();
    }
}
