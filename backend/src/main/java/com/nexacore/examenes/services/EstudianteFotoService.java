package com.nexacore.examenes.services;

import com.nexacore.examenes.models.EstudianteFoto;
import com.nexacore.examenes.repositories.EstudianteFotoRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
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

    public EstudianteFotoService(EstudianteFotoRepository fotoRepository, EstudianteRepository estudianteRepository) {
        this.fotoRepository = fotoRepository;
        this.estudianteRepository = estudianteRepository;
    }

    /**
     * Guarda o reemplaza la foto. El tipo se decide por el contenido del archivo, no por su nombre
     * ni por el Content-Type que manda el navegador.
     */
    @Transactional
    public void guardar(Integer idEstudiante, MultipartFile archivo) {
        verificarEstudiante(idEstudiante);
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
        String tipo = tipoDeImagen(contenido)
                .orElseThrow(() -> new IllegalArgumentException("La fotografía debe ser una imagen JPG, PNG o WEBP."));
        EstudianteFoto foto = fotoRepository.findById(idEstudiante).orElseGet(EstudianteFoto::new);
        foto.setIdEstudiante(idEstudiante);
        foto.setContenido(contenido);
        foto.setTipoContenido(tipo);
        foto.setActualizadoEn(LocalDateTime.now());
        fotoRepository.save(foto);
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
    static Optional<String> tipoDeImagen(byte[] b) {
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
