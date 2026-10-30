package com.nexacore.examenes.services;

import com.nexacore.examenes.models.Notificacion;

import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.ReporteQrDuplicado;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.ReporteQrDuplicadoRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.dto.ReporteQrDuplicadoResponse;
import com.nexacore.examenes.dto.ReglasEstudiante;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

/** Evidencia privada para revisar un posible uso indebido; no declara culpabilidad. */
@Service
public class ReporteQrDuplicadoService {
    private final SesionExamenService sesionExamenService;
    private final ReporteQrDuplicadoRepository repository;
    private final AsistenciaExamenRepository asistenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final NotificacionService notificacionService;
    public ReporteQrDuplicadoService(ReporteQrDuplicadoRepository repository, AsistenciaExamenRepository asistenciaRepository,
                                     UsuarioRepository usuarioRepository, EstudianteRepository estudianteRepository,
                                     NotificacionService notificacionService, SesionExamenService sesionExamenService) {
        this.sesionExamenService = sesionExamenService;
        this.repository = repository; this.asistenciaRepository = asistenciaRepository; this.usuarioRepository = usuarioRepository; this.estudianteRepository = estudianteRepository;
        this.notificacionService = notificacionService;
    }
    @Transactional(readOnly = true)
    public java.util.List<ReporteQrDuplicadoResponse> listar(Integer idExamen) {
        java.time.LocalDateTime cierre = sesionExamenService.ultimoCierre(idExamen);
        return repository.findByIdExamenOrderByFechaHoraServidorDesc(idExamen).stream()
                .filter(r -> cierre == null || r.getFechaHoraServidor() == null || r.getFechaHoraServidor().isAfter(cierre))
                .map(this::respuesta).toList();
    }
    @Transactional(readOnly = true)
    public ReporteQrDuplicado obtener(Integer idExamen, Integer idReporte) {
        return repository.findByIdAndIdExamen(idReporte, idExamen).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el reporte de incidencia."));
    }
    private ReporteQrDuplicadoResponse respuesta(ReporteQrDuplicado reporte) {
        var estudiante = estudianteRepository.findById(reporte.getIdEstudianteQr()).orElse(null);
        var control = usuarioRepository.findById(reporte.getIdUsuarioControl()).orElse(null);
        String nombreQr = estudiante == null ? "Estudiante no disponible" : estudiante.getNombre() + " " + estudiante.getApellidos();
        return new ReporteQrDuplicadoResponse(reporte.getId(), nombreQr, estudiante == null ? null : estudiante.getCodigoSis(),
                reporte.getNombresPresentado(), reporte.getCiPresentado(), reporte.isPresentoCarnet(), reporte.getCodigoSisPresentado(), reporte.getDetalle(),
                control == null ? "Personal de control no disponible" : control.getNombre() + " " + control.getApellidos(), reporte.getEstado(), reporte.getFechaHoraDispositivo());
    }
    @Transactional
    public Integer registrar(Integer idExamen, Integer idEstudianteQr, String nombres, String ci, boolean presentoCarnet, String codigoSis,
                             String detalle, String fechaHoraDispositivo, MultipartFile foto, String emailControl) {
        var asistencia = asistenciaRepository.buscarContexto(idEstudianteQr, idExamen).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el estudiante del QR para este examen"));
        if (asistencia.getFechaHoraIngreso() == null) throw new ControlIngresoException(HttpStatus.CONFLICT,
                "Este QR no tiene un ingreso previo; no corresponde crear un reporte de QR duplicado");
        if (nombres == null || nombres.isBlank() || detalle == null || detalle.isBlank())
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Completa nombres y descripción del reporte.");
        if (presentoCarnet && (ci == null || ci.isBlank()))
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Ingresa el CI del carnet presentado.");
        if (!nombres.strip().matches(ReglasEstudiante.NOMBRE) || nombres.strip().length() > 160)
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Los nombres solo pueden contener letras; cada palabra debe tener al menos 2 letras.");
        // Ningún nombre real repite una letra 3 veces seguidas ("Aaaaaaaa" desbordaba las notificaciones).
        if (java.util.regex.Pattern.compile("(?iu)(\\p{L})\\1\\1").matcher(nombres).find())
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Los nombres no pueden repetir una letra 3 veces seguidas.");
        if (presentoCarnet && !ci.strip().matches(ReglasEstudiante.CI))
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, ReglasEstudiante.MSG_CI);
        if (codigoSis != null && !codigoSis.isBlank() && !codigoSis.strip().matches(ReglasEstudiante.CODIGO_SIS))
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, ReglasEstudiante.MSG_CODIGO_SIS);
        if (codigoSis != null && !codigoSis.isBlank()) {
            com.nexacore.examenes.utils.ValidacionIdentificador.validarCodigoUniversitario(codigoSis.strip());
        }
        if (detalle.strip().length() < 20)
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "La descripción guiada debe tener al menos 20 caracteres.");
        byte[] imagen = leerImagenObligatoria(foto);
        LocalDateTime hora;
        try { hora = OffsetDateTime.parse(fechaHoraDispositivo).toLocalDateTime(); }
        catch (Exception e) { throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "La hora del dispositivo no es válida."); }
        var control = usuarioRepository.findByEmail(emailControl).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        ReporteQrDuplicado reporte = new ReporteQrDuplicado();
        reporte.setIdExamen(idExamen); reporte.setIdEstudianteQr(idEstudianteQr); reporte.setIdUsuarioControl(control.getId());
        reporte.setNombresPresentado(nombres.strip()); reporte.setPresentoCarnet(presentoCarnet); reporte.setCiPresentado(presentoCarnet ? ci.strip() : null);
        reporte.setCodigoSisPresentado(codigoSis == null || codigoSis.isBlank() ? null : codigoSis.strip());
        reporte.setDetalle(detalle.strip()); reporte.setFotoContenido(imagen); reporte.setFotoTipoContenido(foto.getContentType());
        reporte.setFechaHoraDispositivo(hora); reporte.setFechaHoraServidor(asistenciaRepository.obtenerFechaHoraServidor());
        Integer id = repository.save(reporte).getId();
        notificacionService.emitirCambio(NotificacionService.CAMBIO_INGRESO, idExamen, idEstudianteQr);
        var estudiante = asistencia.getEstudiante();
        notificacionService.publicar(Notificacion.QR_DUPLICADO,
                "QR duplicado: " + estudiante.getNombre() + " " + estudiante.getApellidos(),
                notificacionService.materia(idExamen) + " · Se presentó " + nombres.strip()
                        + (presentoCarnet ? " con CI " + ci.strip() : " sin carnet")
                        + " · Reportado por " + control.getNombre() + " " + control.getApellidos(),
                idExamen, idEstudianteQr, "/dashboard/control/" + idExamen + "/informacion", emailControl);
        return id;
    }
    private static byte[] leerImagenObligatoria(MultipartFile foto) {
        if (foto == null || foto.isEmpty()) throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "La fotografía es obligatoria.");
        if (foto.getSize() > EstudianteFotoService.TAMANO_MAXIMO) throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "La fotografía no puede superar 150 KB.");
        try { byte[] bytes = foto.getBytes();
            if (EstudianteFotoService.tipoDeImagen(bytes).isEmpty()) throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "La fotografía debe ser JPG, PNG o WEBP.");
            return bytes;
        } catch (IOException e) { throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "No se pudo leer la fotografía."); }
    }
}
