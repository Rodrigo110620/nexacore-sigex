package com.nexacore.examenes;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.nexacore.examenes.models.Carrera;
import com.nexacore.examenes.models.CarreraId;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.EstudianteCarrera;
import com.nexacore.examenes.models.EstudianteCarreraId;
import com.nexacore.examenes.models.Facultad;
import com.nexacore.examenes.repositories.EstudianteCarreraRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.services.PlanillaEstudiantesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanillaEstudiantesServiceTests {

    @Mock EstudianteRepository estudianteRepository;
    @Mock EstudianteCarreraRepository estudianteCarreraRepository;
    private PlanillaEstudiantesService service;

    @BeforeEach
    void setUp() {
        service = new PlanillaEstudiantesService(estudianteRepository, estudianteCarreraRepository);
    }

    private static Estudiante estudiante(int id, String sis, String nombre, String apellidos, String ci) {
        var e = new Estudiante();
        e.setId(id);
        e.setCodigoSis(sis);
        e.setNombre(nombre);
        e.setApellidos(apellidos);
        e.setCi(ci);
        e.setEmail(sis + "@est.umss.edu");
        return e;
    }

    private static EstudianteCarrera carrera(Estudiante e, int idCarrera, String nombreCarrera) {
        var facultad = new Facultad();
        facultad.setId(1);
        facultad.setNombre("Facultad de Ciencias y Tecnología");

        var carreraId = new CarreraId();
        carreraId.setIdCarrera(idCarrera);
        carreraId.setIdFacultad(1);
        var carrera = new Carrera();
        carrera.setId(carreraId);
        carrera.setFacultad(facultad);
        carrera.setNombre(nombreCarrera);

        var id = new EstudianteCarreraId();
        id.setIdEstudiante(e.getId());
        id.setIdCarrera(idCarrera);
        id.setIdFacultad(1);
        var ec = new EstudianteCarrera();
        ec.setId(id);
        ec.setEstudiante(e);
        ec.setCarrera(carrera);
        return ec;
    }

    private void datos() {
        var rodrigo = estudiante(8, "201904725", "Rodrigo", "Figueroa Camacho", "12433163");
        var ana = estudiante(9, "202404012", "Ana", "Rojas Vargas", "7489210");
        when(estudianteRepository.findAll(any(Sort.class))).thenReturn(List.of(rodrigo, ana));
        when(estudianteCarreraRepository.findAllConCarreraYFacultad()).thenReturn(List.of(
            carrera(rodrigo, 2, "Ingeniería de Sistemas"),
            carrera(rodrigo, 1, "Ingeniería Informática")
        ));
    }

    @Test
    void csvTieneLosEstudiantesRegistradosConElFormatoDeImportacion() {
        datos();

        String csv = new String(service.csv(), StandardCharsets.UTF_8);

        assertEquals("""
            \uFEFFcodigoSis;nombre;apellidos;ci;email;idFacultad;idCarrera
            201904725;Rodrigo;Figueroa Camacho;12433163;201904725@est.umss.edu;1;1
            201904725;Rodrigo;Figueroa Camacho;12433163;201904725@est.umss.edu;1;2
            202404012;Ana;Rojas Vargas;7489210;202404012@est.umss.edu;;
            """, csv);
    }

    @Test
    void csvSinEstudiantesTieneSoloEncabezados() {
        when(estudianteRepository.findAll(any(Sort.class))).thenReturn(List.of());
        when(estudianteCarreraRepository.findAllConCarreraYFacultad()).thenReturn(List.of());

        String csv = new String(service.csv(), StandardCharsets.UTF_8);

        assertEquals("\uFEFFcodigoSis;nombre;apellidos;ci;email;idFacultad;idCarrera\n", csv);
    }

    @Test
    void pdfMuestraNombresDeFacultadYCarrera() throws Exception {
        datos();

        byte[] pdf = service.pdf();

        try (var reader = new PdfReader(pdf)) {
            // Una celda puede partirse en dos líneas: se compara con los espacios normalizados.
            String texto = new PdfTextExtractor(reader).getTextFromPage(1).replaceAll("\\s+", " ");
            assertTrue(texto.contains("Figueroa Camacho"), texto);
            assertTrue(texto.contains("Ingeniería de Sistemas"), texto);
            assertTrue(texto.contains("Facultad de Ciencias y Tecnología"), texto);
            assertTrue(texto.contains("Rojas Vargas"), texto);
            assertTrue(texto.contains("2 estudiantes registrados"), texto);
        }
    }
}
