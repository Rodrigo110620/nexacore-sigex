package com.nexacore.examenes.services;

import com.nexacore.examenes.models.EstudianteFoto;
import com.nexacore.examenes.models.EstudianteFotoSolicitud;
import com.nexacore.examenes.repositories.EstudianteFotoRepository;
import com.nexacore.examenes.repositories.EstudianteFotoSolicitudRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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

    public EstudianteFotoService(EstudianteFotoRepository fotoRepository, EstudianteRepository estudianteRepository,
                                 EstudianteFotoSolicitudRepository solicitudRepository) {
        this.fotoRepository = fotoRepository;
        this.estudianteRepository = estudianteRepository;
        this.solicitudRepository = solicitudRepository;
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
     * ser su foto en el acto: la registra el dueño de una cuenta ya verificada. Si ya tenía una, el
     * cambio queda PENDIENTE y no reemplaza a la que ve el personal de control hasta que la
     * administración lo apruebe.
     *
     * @return true si la foto quedó aprobada; false si queda pendiente de revisión.
     */
    @Transactional
    public boolean enviarDelEstudiante(Integer idEstudiante, MultipartFile archivo) {
        verificarEstudiante(idEstudiante);
        byte[] contenido = leerImagen(archivo);
        if (fotoRepository.findById(idEstudiante).isEmpty()) {
            guardarAprobada(idEstudiante, contenido, tipoDeImagen(contenido).orElseThrow());
            solicitudRepository.findById(idEstudiante).ifPresent(solicitudRepository::delete);
            return true;
        }
        solicitarCambio(idEstudiante, contenido);
        return false;
    }

    /** Un cambio de foto queda PENDIENTE; uno nuevo reemplaza al anterior. */
    private void solicitarCambio(Integer idEstudiante, byte[] contenido) {
        EstudianteFotoSolicitud solicitud = solicitudRepository.findById(idEstudiante)
                .orElseGet(EstudianteFotoSolicitud::new);
        solicitud.setIdEstudiante(idEstudiante);
        solicitud.setContenido(contenido);
        solicitud.setTipoContenido(tipoDeImagen(contenido).orElseThrow());
        solicitud.setEstado(EstudianteFotoSolicitud.PENDIENTE);
        solicitud.setMotivoRechazo(null);
        solicitud.setEnviadaEn(LocalDateTime.now());
        solicitud.setRevisadaEn(null);
        solicitudRepository.save(solicitud);
    }

    /** Cambio de foto de un estudiante que ya tiene una aprobada (lo usa también la administración en pruebas). */
    @Transactional
    public void solicitarCambio(Integer idEstudiante, MultipartFile archivo) {
        verificarEstudiante(idEstudiante);
        solicitarCambio(idEstudiante, leerImagen(archivo));
    }

    @Transactional(readOnly = true)
    public Optional<EstudianteFotoSolicitud> obtenerSolicitud(Integer idEstudiante) {
        return solicitudRepository.findById(idEstudiante);
    }

    @Transactional(readOnly = true)
    public List<EstudianteFotoSolicitud> listarPendientes() {
        return solicitudRepository.findByEstadoOrderByEnviadaEnAsc(EstudianteFotoSolicitud.PENDIENTE);
    }

    /** La foto pendiente pasa a ser la foto del estudiante. */
    @Transactional
    public void aprobarSolicitud(Integer idEstudiante) {
        EstudianteFotoSolicitud solicitud = solicitudPendiente(idEstudiante);
        guardarAprobada(idEstudiante, solicitud.getContenido(), solicitud.getTipoContenido());
        solicitudRepository.delete(solicitud);
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
