package com.nexacore.examenes;

import com.nexacore.examenes.dto.ExportarReporteRequest;
import com.nexacore.examenes.services.ExportacionReporteService;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Descarga de los reportes en Excel y PDF. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ExportacionReporteTests {

    @Autowired MockMvc mockMvc;
    @Autowired ExportacionReporteService service;

    private static final ExportarReporteRequest REPORTE = new ExportarReporteRequest("Expulsiones",
            List.of("Examen: Cálculo I · G1", "Periodo: Este mes"),
            List.of("Estudiante", "Código", "Motivo"),
            List.of(List.of("Ana Rojas Vera", "202100101", "Uso de celular"), List.of("Beto Quispe", "202100102", "Copia")));

    @Test
    void elExcelTieneElEncabezadoYUnaFilaPorRegistro() throws Exception {
        try (var libro = new XSSFWorkbook(new ByteArrayInputStream(service.excel(REPORTE, "Sofía Salazar")))) {
            var hoja = libro.getSheetAt(0);
            assertThat(hoja.getRow(0).getCell(0).getStringCellValue()).isEqualTo("SIGEX · Expulsiones");
            assertThat(hoja.getRow(1).getCell(0).getStringCellValue()).isEqualTo("Examen: Cálculo I · G1");
            assertThat(hoja.getRow(3).getCell(0).getStringCellValue()).startsWith("Generado por Sofía Salazar").endsWith("2 registros");
            assertThat(hoja.getRow(5).getCell(0).getStringCellValue()).isEqualTo("Estudiante");
            assertThat(hoja.getRow(7).getCell(2).getStringCellValue()).isEqualTo("Copia");
        }
    }

    @Test
    void elPdfSeGeneraAunqueNoHayaFilas() {
        assertThat(new String(service.pdf(REPORTE, "Sofía Salazar"), 0, 5, StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        var vacio = new ExportarReporteRequest("Intentos", List.of(), List.of("Estudiante"), List.of());
        assertThat(service.pdf(vacio, "Sofía Salazar")).isNotEmpty();
    }

    @Test
    void loDescarganQuienesExportanReportesYNoElControl() throws Exception {
        String cuerpo = """
                {"titulo":"Expulsiones","filtros":[],"columnas":["Estudiante"],"filas":[["Ana"]]}
                """;
        mockMvc.perform(post("/reportes/exportar.xlsx").with(user("d@umss.edu").roles("DOCENTE")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("reporte_expulsiones_")));
        mockMvc.perform(post("/reportes/exportar.pdf").with(user("a@umss.edu").roles("ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isOk());
        mockMvc.perform(post("/reportes/exportar.pdf").with(user("c@umss.edu").roles("CONTROL")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/reportes/exportar.doc").with(user("a@umss.edu").roles("ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isBadRequest());
    }
}
