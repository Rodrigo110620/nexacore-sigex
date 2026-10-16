package com.nexacore.examenes;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteQrCredencial;
import com.nexacore.examenes.repositories.EstudianteQrCredencialRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.services.QrEstudianteService;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Verifica un QR real: se codifica como PNG, se decodifica y el servidor valida su credencial. */
class QrEstudianteServiceTests {

    @Test
    void generaUnPngEscaneableYResuelveAlEstudianteCorrecto() throws Exception {
        EstudianteQrCredencialRepository credenciales = mock(EstudianteQrCredencialRepository.class);
        EstudianteRepository estudiantes = mock(EstudianteRepository.class);
        QrEstudianteService service = new QrEstudianteService(credenciales, estudiantes, "secreto-de-prueba-seguro");
        Estudiante estudiante = new Estudiante();
        estudiante.setId(91);
        estudiante.setCodigoSis("202401234");
        estudiante.setNombre("María");
        estudiante.setApellidos("Quispe");
        AtomicReference<EstudianteQrCredencial> guardada = new AtomicReference<>();

        when(credenciales.findById(91)).thenReturn(Optional.empty());
        when(credenciales.save(any())).thenAnswer(invocation -> {
            EstudianteQrCredencial fila = invocation.getArgument(0);
            guardada.set(fila);
            return fila;
        });
        when(credenciales.findByHashCredencialAndRevocadoFalse(any())).thenAnswer(invocation ->
                Optional.ofNullable(guardada.get()).filter(f -> f.getHashCredencial().equals(invocation.getArgument(0))));
        when(estudiantes.findById(91)).thenReturn(Optional.of(estudiante));

        QrEstudianteService.QrGenerado qr = service.regenerar(estudiante);
        String leidoDelPng = new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(
                new BufferedImageLuminanceSource(ImageIO.read(new ByteArrayInputStream(qr.png())))))).getText();

        assertEquals(qr.contenido(), leidoDelPng);
        assertTrue(leidoDelPng.startsWith("SIGEX2."));
        assertTrue(!leidoDelPng.contains("202401234"));
        assertEquals("202401234", service.validar(leidoDelPng));
        assertThrows(IllegalArgumentException.class, () -> service.validar(leidoDelPng.substring(0, leidoDelPng.length() - 1) + "x"));
    }
}
