package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.EvidenciaExpulsionResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Expulsion;
import com.nexacore.examenes.models.ExpulsionEvidencia;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.ExpulsionEvidenciaRepository;
import com.nexacore.examenes.repositories.ExpulsionRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.security.SesionActual;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Evidencia de una expulsión: hasta 3 fotos o capturas (JPG, PNG o WEBP de hasta 5 MB). La sube quien puede
 * expulsar en ese examen y la ven el ADMIN, el docente del examen y el personal de control asignado.
 */
@Service
public class ExpulsionEvidenciaService {

    static final int MAX_EVIDENCIAS = 3;
    static final long MAX_BYTES = 5L * 1024 * 1024;

    private final ExpulsionEvidenciaRepository evidenciaRepository;
    private final ExpulsionRepository expulsionRepository;
    private final UsuarioRepository usuarioRepository;

    public ExpulsionEvidenciaService(ExpulsionEvidenciaRepository evidenciaRepository, ExpulsionRepository expulsionRepository,
                                     UsuarioRepository usuarioRepository) {
        this.evidenciaRepository = evidenciaRepository;
        this.expulsionRepository = expulsionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public List<EvidenciaExpulsionResponse> agregar(Integer idExamen, Integer idExpulsion, List<MultipartFile> archivos) {
        Expulsion expulsion = expulsionDelExamen(idExamen, idExpulsion);
        if (archivos == null || archivos.isEmpty() || archivos.stream().allMatch(MultipartFile::isEmpty)) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Elige al menos una foto de evidencia.");
        }
        long actuales = evidenciaRepository.countByIdExpulsion(expulsion.getId());
        if (actuales + archivos.size() > MAX_EVIDENCIAS) {
            throw new ControlIngresoException(HttpStatus.BAD_REQUEST,
                    "La expulsión admite hasta " + MAX_EVIDENCIAS + " fotos de evidencia (ya tiene " + actuales + ").");
        }
        Integer idUsuario = usuarioRepository.findByEmail(SesionActual.email()).map(Usuario::getId).orElse(null);
        for (MultipartFile archivo : archivos) {
            if (archivo.getSize() > MAX_BYTES) {
                throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "Cada foto de evidencia debe pesar hasta 5 MB.");
            }
            byte[] contenido;
            try {
                contenido = archivo.getBytes();
            } catch (IOException e) {
                throw new ControlIngresoException(HttpStatus.BAD_REQUEST, "No se pudo leer la foto de evidencia.");
            }
            String tipo = EstudianteFotoService.tipoDeImagen(contenido).orElseThrow(() ->
                    new ControlIngresoException(HttpStatus.BAD_REQUEST, "La evidencia debe ser una imagen JPG, PNG o WEBP."));
            ExpulsionEvidencia evidencia = new ExpulsionEvidencia();
            evidencia.setIdExpulsion(expulsion.getId());
            evidencia.setContenido(contenido);
            evidencia.setTipoContenido(tipo);
            evidencia.setIdUsuario(idUsuario);
            evidencia.setSubidaEn(LocalDateTime.now());
            evidenciaRepository.save(evidencia);
        }
        return listar(idExamen, idExpulsion);
    }

    @Transactional(readOnly = true)
    public List<EvidenciaExpulsionResponse> listar(Integer idExamen, Integer idExpulsion) {
        expulsionDelExamen(idExamen, idExpulsion);
        return evidenciaRepository.resumenDe(idExpulsion).stream()
                .map(f -> new EvidenciaExpulsionResponse(((Number) f[0]).intValue(), (String) f[1], ((Number) f[2]).longValue(),
                        f[3] instanceof java.sql.Timestamp t ? t.toLocalDateTime() : (LocalDateTime) f[3]))
                .toList();
    }

    @Transactional(readOnly = true)
    public ExpulsionEvidencia imagen(Integer idExamen, Integer idExpulsion, Integer idEvidencia) {
        expulsionDelExamen(idExamen, idExpulsion);
        return evidenciaRepository.findById(idEvidencia)
                .filter(e -> Objects.equals(e.getIdExpulsion(), idExpulsion))
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró la evidencia."));
    }

    /** La expulsión, si es de ese examen (la ruta verifica el permiso sobre el examen). */
    private Expulsion expulsionDelExamen(Integer idExamen, Integer idExpulsion) {
        return expulsionRepository.findById(idExpulsion)
                .filter(e -> Objects.equals(e.getIdExamen(), idExamen))
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró la expulsión en este examen."));
    }
}
