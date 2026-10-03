package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.IntentoIngresoResponse;
import com.nexacore.examenes.dto.RegistrarIntentoIngresoRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.IntentoIngresoRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class IntentoIngresoService {
    private final IntentoIngresoRepository intentoRepository;
    private final EstudianteRepository estudianteRepository;
    private final ExamenRepository examenRepository;
    private final AsistenciaExamenRepository asistenciaRepository;
    private final UsuarioRepository usuarioRepository;

    public IntentoIngresoService(IntentoIngresoRepository intentoRepository, EstudianteRepository estudianteRepository,
                                 ExamenRepository examenRepository, AsistenciaExamenRepository asistenciaRepository,
                                 UsuarioRepository usuarioRepository) {
        this.intentoRepository = intentoRepository;
        this.estudianteRepository = estudianteRepository;
        this.examenRepository = examenRepository;
        this.asistenciaRepository = asistenciaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public void registrar(RegistrarIntentoIngresoRequest request, String emailControl) {
        if (!examenRepository.existsByIdIdExamen(request.idExamen())) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + request.idExamen());
        }
        estudianteRepository.findById(request.idEstudiante()).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el estudiante indicado"));
        if (asistenciaRepository.buscarContexto(request.idEstudiante(), request.idExamen()).isPresent()) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "El estudiante ya está asociado a este examen; no corresponde registrar un intento incorrecto");
        }
        var control = usuarioRepository.findByEmail(emailControl).orElseThrow(() ->
                new ControlIngresoException(HttpStatus.UNAUTHORIZED, "No se encontró el usuario autenticado"));
        int insertados = intentoRepository.registrar(request.idExamen(), request.idEstudiante(), control.getId(),
                request.identificador().trim(), request.motivo().trim());
        if (insertados != 1) throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen indicado");
    }

    @Transactional(readOnly = true)
    public List<IntentoIngresoResponse> listar(Integer idExamen, Integer idEstudiante) {
        if (!examenRepository.existsByIdIdExamen(idExamen)) {
            throw new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el examen " + idExamen);
        }
        return intentoRepository.listar(idExamen, idEstudiante).stream().map(this::respuesta).toList();
    }

    private IntentoIngresoResponse respuesta(Object[] fila) {
        return new IntentoIngresoResponse(((Number) fila[0]).intValue(), ((Number) fila[1]).intValue(),
                fila[2] == null ? null : ((Number) fila[2]).intValue(), (String) fila[3], (String) fila[4],
                (String) fila[5], (String) fila[6], (String) fila[7], aFecha(fila[8]));
    }

    private LocalDateTime aFecha(Object valor) {
        if (valor instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
        return (LocalDateTime) valor;
    }
}
