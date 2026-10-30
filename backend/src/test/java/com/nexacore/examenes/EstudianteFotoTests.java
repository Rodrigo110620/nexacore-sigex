package com.nexacore.examenes;

import com.nexacore.examenes.models.CondicionEstudiante;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.repositories.EstudianteFotoRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** ACCS-01/03: fotografía y condición del estudiante para identificarlo en el control de ingreso. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class EstudianteFotoTests {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};

    @Autowired MockMvc mockMvc;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired EstudianteFotoRepository fotoRepository;

    private Integer idEstudiante;

    @BeforeEach
    void crearEstudiante() {
        Estudiante e = new Estudiante();
        e.setNombre("Laura");
        e.setApellidos("Paredes");
        e.setCi("74839201");
        e.setEmail("laura.foto@est.umss.edu");
        e.setCodigoSis("202600077");
        e.setCondicion(CondicionEstudiante.POSTULANTE);
        idEstudiante = estudianteRepository.saveAndFlush(e).getId();
    }

    @AfterEach
    void limpiar() {
        fotoRepository.deleteAll();
        estudianteRepository.deleteById(idEstudiante);
    }

    private MockMultipartFile archivo(byte[] contenido) {
        return new MockMultipartFile("file", "foto.jpg", "image/jpeg", contenido);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void subeVeYQuitaLaFoto() throws Exception {
        mockMvc.perform(multipart("/estudiantes/{id}/foto", idEstudiante).file(archivo(JPEG))
                        .with(r -> { r.setMethod("PUT"); return r; }))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/estudiantes/{id}/foto", idEstudiante))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(JPEG));
        mockMvc.perform(get("/estudiantes/{id}", idEstudiante))
                .andExpect(jsonPath("$.fotoUrl").value("/estudiantes/" + idEstudiante + "/foto"))
                .andExpect(jsonPath("$.condicion").value("POSTULANTE"));

        mockMvc.perform(delete("/estudiantes/{id}/foto", idEstudiante)).andExpect(status().isNoContent());
        mockMvc.perform(get("/estudiantes/{id}/foto", idEstudiante)).andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rechazaArchivosQueNoSonImagenAunqueDiganSerJpg() throws Exception {
        mockMvc.perform(multipart("/estudiantes/{id}/foto", idEstudiante)
                        .file(archivo("<script>alert(1)</script>".getBytes()))
                        .with(r -> { r.setMethod("PUT"); return r; }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La fotografía debe ser una imagen JPG, PNG o WEBP."));
        assertFalse(fotoRepository.existsById(idEstudiante));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rechazaFotosDeMasDe150KbParaNoLlenarLaBase() throws Exception {
        byte[] grande = new byte[150 * 1024 + 1];
        System.arraycopy(JPEG, 0, grande, 0, JPEG.length);
        mockMvc.perform(multipart("/estudiantes/{id}/foto", idEstudiante).file(archivo(grande))
                        .with(r -> { r.setMethod("PUT"); return r; }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La fotografía no puede superar 150 KB."));
        assertFalse(fotoRepository.existsById(idEstudiante));
    }

    @Test
    @WithMockUser(roles = "CONTROL")
    void controlVeLaFotoPeroNoPuedeCambiarla() throws Exception {
        mockMvc.perform(multipart("/estudiantes/{id}/foto", idEstudiante).file(archivo(JPEG))
                        .with(r -> { r.setMethod("PUT"); return r; }))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/estudiantes/{id}/foto", idEstudiante)).andExpect(status().isNotFound());
    }

    /** La foto subida por el personal queda oficial sin revisión: solo el ADMIN puede cambiarla o quitarla. */
    @Test
    @WithMockUser(roles = "DOCENTE")
    void elDocenteVeLaFotoPeroNoPuedeCambiarlaNiQuitarla() throws Exception {
        mockMvc.perform(multipart("/estudiantes/{id}/foto", idEstudiante).file(archivo(JPEG))
                        .with(r -> { r.setMethod("PUT"); return r; }))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/estudiantes/{id}/foto", idEstudiante)).andExpect(status().isForbidden());
        mockMvc.perform(get("/estudiantes/{id}/foto", idEstudiante)).andExpect(status().isNotFound());
    }

    @Test
    void laIdentificacionIndicaCondicionYSiTieneFoto() {
        var sinFoto = estudianteRepository.identificarPorCodigoSis("202600077", 999).orElseThrow();
        assertEquals("POSTULANTE", sinFoto.condicion());
        assertFalse(sinFoto.tieneFoto());

        var foto = new com.nexacore.examenes.models.EstudianteFoto();
        foto.setIdEstudiante(idEstudiante);
        foto.setContenido(JPEG);
        foto.setTipoContenido("image/jpeg");
        foto.setActualizadoEn(java.time.LocalDateTime.now());
        fotoRepository.saveAndFlush(foto);

        assertTrue(estudianteRepository.identificarPorCodigoSis("202600077", 999).orElseThrow().tieneFoto());
    }
}
