package com.nexacore.examenes.services;

import com.nexacore.examenes.models.ReporteFoto;
import com.nexacore.examenes.repositories.ReporteFotoRepository;
import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Quién revisa una foto reportada: el ADMIN (FOTOS_REVISAR) cualquiera; el DOCENTE y el CONTROL, solo si el
 * reporte abierto es de uno de sus exámenes (los suyos o donde están asignados). Los cambios de foto que el
 * estudiante pide por su cuenta, sin reporte, siguen siendo solo del ADMIN.
 */
@Service("fotoRevisionAcceso")
public class FotoRevisionAcceso {

    private final ReporteFotoRepository reporteRepository;
    private final ExamenAccesoService examenAcceso;

    public FotoRevisionAcceso(ReporteFotoRepository reporteRepository, ExamenAccesoService examenAcceso) {
        this.reporteRepository = reporteRepository;
        this.examenAcceso = examenAcceso;
    }

    public boolean puedeRevisar(Integer idEstudiante, Authentication authentication) {
        if (Permisos.tiene(authentication, Permiso.FOTOS_REVISAR)) return true;
        if (!Permisos.tiene(authentication, Permiso.FOTOS_REPORTAR)) return false;
        return reporteRepository.findFirstByIdEstudianteAndEstado(idEstudiante, ReporteFoto.ABIERTO)
                .map(ReporteFoto::getIdExamen)
                .map(idExamen -> examenAcceso.esMio(idExamen, authentication))
                .orElse(false);
    }
}
