package com.nexacore.examenes;

import com.jayway.jsonpath.JsonPath;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.models.UsuarioRol;
import com.nexacore.examenes.models.UsuarioRolId;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.repositories.UsuarioRolRepository;
import com.nexacore.examenes.services.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** QA de IMP-11: registro completo y consulta administrativa del historial. */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class HistorialOperacionesTests {

    private static final String ADMIN_EMAIL = "qa.admin.historial@umss.edu.bo";

    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired RolRepository rolRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired UsuarioRolRepository usuarioRolRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @MockitoBean EmailService emailService;

    @BeforeEach
    void prepararAdminRealParaAuditoria() {
        when(emailService.enviarPasswordTemporal(anyString(), anyString(), anyString())).thenReturn(false);
        // Hibernate copia el default nextval del esquema PostgreSQL, pero H2 no crea esa secuencia.
        jdbc.execute("CREATE SEQUENCE IF NOT EXISTS auditoria_operacion_id_auditoria_seq START WITH 1");
        if (rolRepository.findByNombre("CONTROL").isEmpty()) {
            Rol control = new Rol();
            control.setNombre("CONTROL");
            rolRepository.saveAndFlush(control);
        }
        Rol admin = rolRepository.findByNombre("ADMIN").orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre("ADMIN");
            return rolRepository.saveAndFlush(rol);
        });
        Usuario usuario = usuarioRepository.findByEmail(ADMIN_EMAIL).orElseGet(() -> {
            Usuario u = new Usuario();
            u.setNombre("Carla");
            u.setApellidos("Mendez");
            u.setCi("7654321");
            u.setEmail(ADMIN_EMAIL);
            u.setPassword(passwordEncoder.encode("SoloParaQA123*"));
            u.setEstado("activo");
            return usuarioRepository.saveAndFlush(u);
        });
        UsuarioRolId id = new UsuarioRolId();
        id.setIdUsuario(usuario.getId());
        id.setIdRol(admin.getId());
        if (!usuarioRolRepository.existsById(id)) {
            UsuarioRol ur = new UsuarioRol();
            ur.setId(id);
            ur.setIdUsuario(usuario);
            ur.setIdRol(admin);
            usuarioRolRepository.saveAndFlush(ur);
        }
    }

    @Test
    void registraTodasLasOperacionesDeUsuariosYRolesYElAdminLasConsulta() throws Exception {
        var admin = user(ADMIN_EMAIL).roles("ADMIN");

        String usuarioCreado = mockMvc.perform(post("/usuarios").with(admin).contentType("application/json")
                        .content("""
                                {"nombre":"Pedro","apellidos":"Rojas","ci":"8123456",
                                 "email":"pedro.qa@umss.edu.bo","rol":"CONTROL","activo":true,
                                 "notificarEmail":false,"idMaterias":null}
                                """))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int idUsuario = JsonPath.read(usuarioCreado, "$.id");

        mockMvc.perform(put("/usuarios/" + idUsuario).with(admin).contentType("application/json")
                        .content("""
                                {"nombre":"Pedro","apellidos":"Rojas Flores","ci":"8123456",
                                 "email":"pedro.qa@umss.edu.bo","rol":"CONTROL","activo":true,
                                 "notificarEmail":false,"idMaterias":null}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/usuarios/" + idUsuario + "/estado").with(admin).contentType("application/json")
                        .content("{\"activo\":false}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/usuarios/" + idUsuario + "/estado").with(admin).contentType("application/json")
                        .content("{\"activo\":true}"))
                .andExpect(status().isOk());

        String rolCreado = mockMvc.perform(post("/roles").with(admin).contentType("application/json")
                        .content("{\"nombre\":\"QA_AUXILIAR\",\"descripcion\":\"Apoya las pruebas de auditoria\",\"permisos\":[\"REPORTES_VER\"]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int idRol = JsonPath.read(rolCreado, "$.id");
        mockMvc.perform(put("/roles/" + idRol).with(admin).contentType("application/json")
                        .content("{\"descripcion\":\"Apoya las pruebas del historial\",\"permisos\":[\"REPORTES_VER\",\"ESTUDIANTES_VER\"]}"))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/roles/" + idRol).with(admin)).andExpect(status().isNoContent());

        List<String> acciones = jdbc.queryForList("""
                SELECT accion FROM auditoria_operacion a
                JOIN usuario u ON u.id_usuario = a.id_usuario
                WHERE u.email = ? ORDER BY a.id_auditoria
                """, String.class, ADMIN_EMAIL);
        assertThat(acciones).containsSubsequence(
                "USUARIO_CREADO", "USUARIO_EDITADO", "USUARIO_BLOQUEADO", "USUARIO_DESBLOQUEADO",
                "ROL_CREADO", "ROL_EDITADO", "ROL_ELIMINADO");

        mockMvc.perform(get("/admin/historial-operaciones").with(admin)
                        .param("search", ADMIN_EMAIL).param("page", "0").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido.length()").value(5))
                .andExpect(jsonPath("$.totalRegistros").value(7))
                .andExpect(jsonPath("$.totalPaginas").value(2))
                .andExpect(jsonPath("$.contenido[0].usuario").value("Carla Mendez"))
                .andExpect(jsonPath("$.contenido[0].rolUsuario").value("ADMIN"))
                .andExpect(jsonPath("$.contenido[0].fechaHora").isNotEmpty());

        mockMvc.perform(get("/admin/historial-operaciones").with(admin)
                        .param("search", ADMIN_EMAIL).param("operacion", "Activar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].accion").value("USUARIO_DESBLOQUEADO"))
                .andExpect(jsonPath("$.contenido[0].objetivo").value("Pedro Rojas Flores"))
                .andExpect(jsonPath("$.contenido[0].detalle").value("Reactivó la cuenta"));
        // Editar el rol: legible, con el permiso agregado (no el JSON).
        mockMvc.perform(get("/admin/historial-operaciones").with(admin)
                        .param("search", ADMIN_EMAIL).param("modulo", "Roles").param("operacion", "Editar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].modulo").value("Roles"))
                .andExpect(jsonPath("$.contenido[0].operacion").value("Editar"))
                .andExpect(jsonPath("$.contenido[0].objetivo").value("Rol QA_AUXILIAR"))
                .andExpect(jsonPath("$.contenido[0].diferencias.length()").value(1))
                .andExpect(jsonPath("$.contenido[0].diferencias[0].campo").value("Agregado"))
                .andExpect(jsonPath("$.contenido[0].diferencias[0].antes").doesNotExist());
        mockMvc.perform(get("/admin/historial-operaciones").with(admin)
                        .param("search", ADMIN_EMAIL).param("modulo", "Roles").param("operacion", "Eliminar")
                        .param("desde", LocalDate.now().minusDays(1).toString())
                        .param("hasta", LocalDate.now().plusDays(1).toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].accion").value("ROL_ELIMINADO"));
    }

    @Test
    void soloElAdminPuedeConsultarElHistorial() throws Exception {
        mockMvc.perform(get("/admin/historial-operaciones")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/historial-operaciones").with(user("docente@umss.edu.bo").roles("DOCENTE")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/historial-operaciones").with(user(ADMIN_EMAIL).roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void diceAQuienAgregoYQuitoDelControlYFiltraPorQuienLoHizo() throws Exception {
        var admin = user(ADMIN_EMAIL).roles("ADMIN");
        Integer idAdmin = usuarioRepository.findByEmail(ADMIN_EMAIL).orElseThrow().getId();
        jdbc.update("INSERT INTO auditoria_operacion (id_usuario, accion, detalles) VALUES (?, 'PERSONAL_CONTROL_ASIGNADO', ?)", idAdmin,
                "{\"idExamen\":999,\"personal\":[\"Luis Paz\"],\"anterior\":[\"Marcelo Figueroa\"],"
                        + "\"agregados\":[\"Luis Paz\"],\"quitados\":[\"Marcelo Figueroa\"]}");

        mockMvc.perform(get("/admin/historial-operaciones").with(admin).param("usuario", String.valueOf(idAdmin))
                        .param("operacion", "Asignar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].detalle").value("Agregó a Luis Paz al control · Quitó a Marcelo Figueroa del control"))
                .andExpect(jsonPath("$.contenido[0].diferencias[0].campo").value("Personal de control"))
                .andExpect(jsonPath("$.contenido[0].diferencias[0].antes").value("Marcelo Figueroa"))
                .andExpect(jsonPath("$.contenido[0].diferencias[0].despues").value("Luis Paz"));
        // Otro usuario: no ve las operaciones del admin.
        mockMvc.perform(get("/admin/historial-operaciones").with(admin).param("usuario", "987654"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(0));
        mockMvc.perform(get("/admin/historial-operaciones/usuarios").with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idUsuario == " + idAdmin + ")].nombre").value("Carla Mendez"));
        mockMvc.perform(get("/admin/historial-operaciones/exportar.pdf").with(admin).param("usuario", String.valueOf(idAdmin)))
                .andExpect(status().isOk());
    }

    @Test
    void laDescargaFiltraPorTipoExamenYDocente() throws Exception {
        var admin = user(ADMIN_EMAIL).roles("ADMIN");
        Integer idAdmin = usuarioRepository.findByEmail(ADMIN_EMAIL).orElseThrow().getId();
        jdbc.update("INSERT INTO auditoria_operacion (id_usuario, accion, detalles) VALUES (?, 'EXPULSION_REGISTRADA', ?)", idAdmin,
                "{\"idExamen\":999,\"idEstudiante\":1,\"motivo\":\"Copia\"}");
        jdbc.update("INSERT INTO auditoria_operacion (id_usuario, accion, detalles) VALUES (?, 'INTENTO_INGRESO_REGISTRADO', ?)", idAdmin,
                "{\"idExamen\":9990,\"ciOCodigo\":\"1\"}");

        mockMvc.perform(get("/admin/historial-operaciones").with(admin).param("usuario", String.valueOf(idAdmin)).param("tipo", "EXPULSIONES"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].accion").value("EXPULSION_REGISTRADA"));
        mockMvc.perform(get("/admin/historial-operaciones").with(admin).param("usuario", String.valueOf(idAdmin)).param("tipo", "INCIDENCIAS"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1))
                .andExpect(jsonPath("$.contenido[0].accion").value("INTENTO_INGRESO_REGISTRADO"));
        // El examen 999 no confunde al 9990.
        mockMvc.perform(get("/admin/historial-operaciones").with(admin).param("examen", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(1));
        // Un docente sin exámenes: nada.
        mockMvc.perform(get("/admin/historial-operaciones").with(admin).param("docente", "987654"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRegistros").value(0));
        mockMvc.perform(get("/admin/historial-operaciones/exportar.pdf").with(admin).param("examen", "999").param("tipo", "EXPULSIONES"))
                .andExpect(status().isOk());
    }
}
