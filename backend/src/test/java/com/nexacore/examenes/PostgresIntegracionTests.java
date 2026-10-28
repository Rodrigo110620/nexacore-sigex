package com.nexacore.examenes;

import com.nexacore.examenes.dto.RegistrarEstudianteRequest;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import com.nexacore.examenes.services.EmailService;
import com.nexacore.examenes.services.EstudianteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Lo que H2 no puede probar: las migraciones de Flyway, el esquema validado por Hibernate, las
 * restricciones y triggers de PostgreSQL y las consultas que H2 no acepta (…IgnoreCase sobre
 * columnas de texto largo). Sin Docker disponible, la clase se omite.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class PostgresIntegracionTests {

    /** La misma versión de docker-compose.dev.yml. */
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15.10");

    @DynamicPropertySource
    static void baseDeDatos(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.locations", () -> "classpath:db/migration");
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired com.nexacore.examenes.repositories.AsistenciaExamenRepository asistenciaExamenRepository;
    @Autowired com.nexacore.examenes.repositories.TrasladoAmbienteRepository trasladoRepository;
    @Autowired com.nexacore.examenes.repositories.ExpulsionRepository expulsionRepository;
    @Autowired com.nexacore.examenes.services.ExamenService examenService;
    @Autowired com.nexacore.examenes.services.SesionExamenService sesionExamenService;
    @Autowired com.nexacore.examenes.services.ControlIngresoService controlIngresoService;
    @Autowired com.nexacore.examenes.repositories.MateriaRepository materiaRepository;
    @Autowired EstudianteService estudianteService;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired AmbienteRepository ambienteRepository;
    @Autowired com.nexacore.examenes.services.HabilitacionService habilitacionService;
    @Autowired com.nexacore.examenes.services.NormasExamenService normasExamenService;
    @Autowired com.nexacore.examenes.services.PanelEstudianteService panelEstudianteService;
    @Autowired com.nexacore.examenes.services.ExcepcionService excepcionService;
    @Autowired com.nexacore.examenes.services.IdentificacionService identificacionService;
    @Autowired com.nexacore.examenes.services.IntentoIngresoService intentoIngresoService;
    @Autowired com.nexacore.examenes.services.ExpulsionConsultaService expulsionConsultaService;
    @Autowired com.nexacore.examenes.repositories.ExamenRepository examenRepository;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired com.nexacore.examenes.repositories.ExcepcionNoHabilitadoRepository excepcionRepository;

    /** Tras escribir con JDBC en la misma transacción, Hibernate debe volver a leer. */
    private void sincronizar() {
        entityManager.flush();
        entityManager.clear();
    }
    @MockitoBean EmailService emailService;

    @Test
    void flywayAplicaTodasLasMigracionesYHibernateValidaElEsquema() throws IOException {
        // Si el contexto arrancó, Hibernate ya validó el esquema (ddl-auto=validate).
        int ultima = Arrays.stream(new PathMatchingResourcePatternResolver()
                        .getResources("classpath:db/migration/V*__*.sql"))
                .map(Resource::getFilename)
                .filter(Objects::nonNull)
                .map(nombre -> Pattern.compile("^V(\\d+)__").matcher(nombre))
                .filter(Matcher::find)
                .mapToInt(m -> Integer.parseInt(m.group(1)))
                .max().orElseThrow();
        Integer aplicada = jdbc.queryForObject(
                "SELECT max(version::int) FROM flyway_schema_history WHERE success AND version ~ '^[0-9]+$'",
                Integer.class);
        assertThat(aplicada).isEqualTo(ultima);
    }

    @Test
    void lasConsultasIgnoreCaseFuncionanEnPostgres() {
        jdbc.update("""
                INSERT INTO estudiante (codigo_sis, nombre, apellidos, ci, email)
                VALUES ('202104010', 'Ana', 'Rojas', '7489210', 'ana.rojas@est.umss.edu')
                """);
        assertThat(estudianteRepository.existsByEmailIgnoreCase("ANA.ROJAS@est.umss.edu")).isTrue();
        assertThat(estudianteRepository.existsByCodigoSisIgnoreCase("202104010")).isTrue();
        assertThat(estudianteRepository.existsByCiIgnoreCase("7489210")).isTrue();
        assertThat(usuarioRepository.existsByEmailIgnoreCase("NO.EXISTE@umss.edu")).isFalse();
        assertThat(usuarioRepository.existsByCiIgnoreCase("0000000")).isFalse();
        assertThat(ambienteRepository.existsByNombreIgnoreCase("aula que no existe")).isFalse();
    }

    @Test
    void elTelefonoSigueLaMismaReglaEnLaApiYEnLaBase() {
        Integer idFacultad = jdbc.queryForObject("SELECT id_facultad FROM carrera ORDER BY id_carrera LIMIT 1", Integer.class);
        Integer idCarrera = jdbc.queryForObject("SELECT id_carrera FROM carrera ORDER BY id_carrera LIMIT 1", Integer.class);
        var registrado = estudianteService.registrar(new RegistrarEstudianteRequest(
                "María", "González", "7489299", "22345678", "maria.gonzalez@est.umss.edu", "202104099",
                idFacultad, idCarrera, null, null));
        assertThat(registrado.telefono()).isEqualTo("22345678");

        // Solo queda la restricción de la V32 (la V33 quita la de la V30 que existió un tiempo).
        assertThat(jdbc.queryForList("""
                SELECT conname FROM pg_constraint
                WHERE conrelid = 'estudiante'::regclass AND conname LIKE '%telefono%'
                """, String.class)).containsExactly("chk_estudiante_telefono");
        assertThatThrownBy(() -> jdbc.update(
                "UPDATE estudiante SET telefono = '51234567' WHERE codigo_sis = '202104099'"))
                .hasMessageContaining("chk_estudiante_telefono");
    }

    @Test
    void laCuentaDeUnEstudianteSoloPuedeTenerElRolEstudiante() {
        jdbc.update("""
                INSERT INTO usuario (nombre, apellidos, ci, email, password, estado)
                VALUES ('Ana', 'Rojas', '7489210', 'ana.rojas@est.umss.edu', 'x', 'activo')
                """);
        Integer idUsuario = jdbc.queryForObject(
                "SELECT id_usuario FROM usuario WHERE email = 'ana.rojas@est.umss.edu'", Integer.class);
        jdbc.update("""
                INSERT INTO estudiante (codigo_sis, nombre, apellidos, ci, email, id_usuario)
                VALUES ('202104010', 'Ana', 'Rojas', '7489210', 'ana.rojas@est.umss.edu', ?)
                """, idUsuario);

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO usuario_rol (id_usuario, id_rol)
                SELECT ?, id_rol FROM rol WHERE nombre = 'ADMIN'
                """, idUsuario))
                .hasMessageContaining("solo puede tener el rol ESTUDIANTE");
    }

    // ---------- MAST-03/04: normas en su tabla, quitar estudiante y cruces de horario ----------

    private int idDocente;
    private int idParalelo;
    private int idAmbiente;

    /** Docente, materia y paralelo; devuelve el id del paralelo. */
    @Test
    void laBusquedaDeMateriasIgnoraTildesEnPostgres() {
        com.nexacore.examenes.models.Materia materia = new com.nexacore.examenes.models.Materia();
        materia.setSigla("ZFS902");
        materia.setNombre("Física Óptica Zeta");
        materiaRepository.saveAndFlush(materia);

        for (String q : new String[]{"fisica optica", "física óptica", "FÍSICA ÓPTICA", "zfs902"}) {
            assertThat(materiaRepository.buscar(com.nexacore.examenes.utils.TextoBusqueda.sinTildes(q)))
                    .extracting(com.nexacore.examenes.models.Materia::getNombre)
                    .contains("Física Óptica Zeta");
        }
    }

    @Test
    void reprogramarUnExamenFinalizadoGuardaLaSesionYReiniciaLosIngresos() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-904");
        int idExamen = examen(paralelo, "08:00", 90);
        int ingreso = estudiante("202000041", "Ana");
        int denegado = estudiante("202000042", "Beto");
        int conDeuda = estudiante("202000043", "Ciro");
        String asociar = """
                INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, motivo_inhabilitacion,
                                               fecha_hora_ingreso)
                VALUES (?, ?, ?, ?, ?, ?)
                """;
        jdbc.update(asociar, ingreso, idExamen, paralelo, true, null, java.sql.Timestamp.valueOf("2026-10-20 07:55:00"));
        jdbc.update(asociar, denegado, idExamen, paralelo, false, "Ingreso denegado por CONTROL: Documento inválido", null);
        jdbc.update(asociar, conDeuda, idExamen, paralelo, false,
                "Deuda pendiente\nIngreso denegado por CONTROL: Llegó tarde", null);
        jdbc.update("""
                INSERT INTO registro_control_ingreso (id_examen, id_paralelo, id_estudiante, id_control, id_usuario_control,
                                                      resultado_autorizacion, fecha_hora)
                VALUES (?, ?, ?, 1, ?, 'AUTORIZADO', TIMESTAMP '2026-10-20 07:55:00')
                """, idExamen, paralelo, ingreso, idDocente);
        // El examen fue ayer: ya finalizó.
        jdbc.update("UPDATE examen SET fecha = CURRENT_DATE - 1 WHERE id_examen = ?", idExamen);
        sincronizar();

        var nueva = java.time.LocalDate.now().plusDays(7);
        var respuesta = examenService.reprogramar(idExamen, paralelo, new com.nexacore.examenes.dto.ReprogramarExamenRequest(
                nueva, java.time.LocalTime.of(10, 0), 120, "Se repite por un corte de luz"), "luis.paz@umss.edu");
        sincronizar();

        assertThat(respuesta.fecha()).isEqualTo(nueva);
        assertThat(respuesta.estado()).isEqualTo("programado");

        // La sesión que terminó queda en el historial, con quién y por qué se reprogramó.
        var sesiones = sesionExamenService.listar(idExamen);
        assertThat(sesiones).hasSize(1);
        var anterior = sesiones.get(0);
        assertThat(anterior.numero()).isEqualTo(1);
        assertThat(anterior.fecha()).isEqualTo(java.time.LocalDate.now().minusDays(1));
        assertThat(anterior.asociados()).isEqualTo(3);
        assertThat(anterior.ingresaron()).isEqualTo(1);
        assertThat(anterior.motivoReprogramacion()).isEqualTo("Se repite por un corte de luz");
        assertThat(anterior.reprogramadoPor()).isEqualTo("Luis Paz");
        assertThat(anterior.estudiantes()).filteredOn(e -> e.idEstudiante() == ingreso).singleElement()
                .satisfies(e -> assertThat(e.fechaHoraIngreso()).isEqualTo(java.time.LocalDateTime.parse("2026-10-20T07:55")));

        // Todos vuelven a "no ingresado"; sin las denegaciones del control de la sesión anterior.
        assertThat(jdbc.queryForObject("SELECT COUNT(fecha_hora_ingreso) FROM asistencia_examen WHERE id_examen = ?",
                Integer.class, idExamen)).isZero();
        assertThat(jdbc.queryForMap("SELECT habilitado, motivo_inhabilitacion FROM asistencia_examen WHERE id_estudiante = ?", denegado))
                .containsEntry("habilitado", null).containsEntry("motivo_inhabilitacion", null);
        assertThat(jdbc.queryForMap("SELECT habilitado, motivo_inhabilitacion FROM asistencia_examen WHERE id_estudiante = ?", conDeuda))
                .containsEntry("habilitado", false).containsEntry("motivo_inhabilitacion", "Deuda pendiente");

        // El autorizado de la sesión anterior ya no aparece como ingreso de la sesión actual.
        assertThat(controlIngresoService.consultarRegistrosExamen(idExamen)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registro_control_ingreso WHERE id_examen = ?",
                Integer.class, idExamen)).isEqualTo(1);

        // Ya no está finalizado: no se puede volver a reprogramar hasta que termine.
        assertThatThrownBy(() -> examenService.reprogramar(idExamen, paralelo,
                new com.nexacore.examenes.dto.ReprogramarExamenRequest(nueva.plusDays(1), java.time.LocalTime.of(10, 0),
                        60, "Otra vez"), "luis.paz@umss.edu"))
                .hasMessageContaining("Solo se reprograma un examen que ya finalizó");
    }

    @Test
    void laExpulsionGuardaLaHoraDelServidorEsInmutableYValeSoloParaLaSesionActual() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-905");
        int idExamen = examen(paralelo, "08:00", 90);
        int expulsado = estudiante("202000051", "Eva");
        int ajeno = estudiante("202000052", "Leo");
        jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) "
                + "VALUES (?, ?, ?, true, NOW())", expulsado, idExamen, paralelo);

        com.nexacore.examenes.models.Expulsion expulsion = new com.nexacore.examenes.models.Expulsion();
        expulsion.setIdEstudiante(expulsado);
        expulsion.setIdExamen(idExamen);
        expulsion.setIdUsuarioResponsable(idDocente);
        expulsion.setMotivo("Uso de celular durante el examen");
        Integer id = expulsionRepository.saveAndFlush(expulsion).getId();
        sincronizar();

        // La hora la pone la base.
        var guardada = expulsionRepository.findById(id).orElseThrow();
        assertThat(guardada.getFechaHora()).isNotNull();
        assertThat(expulsionRepository.fechaHoraRegistrada(id)).isEqualTo(guardada.getFechaHora());
        assertThat(expulsionRepository.expulsadoEnSesionActual(expulsado, idExamen, null)).isTrue();
        assertThat(expulsionRepository.deSesionActual(idExamen, null)).hasSize(1);

        // La hora no se puede modificar, ni por SQL; el motivo sí (p. ej. una corrección de redacción).
        assertThat(errorSql("UPDATE expulsion SET fecha_hora = fecha_hora - interval '1 hour' WHERE id_expulsion = " + id))
                .contains("La hora de la expulsión no se puede modificar");
        assertThat(jdbc.update("UPDATE expulsion SET motivo = 'Uso de celular' WHERE id_expulsion = ?", id)).isEqualTo(1);

        // Motivo obligatorio y solo para estudiantes asociados al examen.
        assertThat(errorSql("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo) VALUES ("
                + expulsado + ", " + idExamen + ", " + idDocente + ", '   ')")).contains("ck_expulsion_motivo");
        assertThat(errorSql("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo) VALUES ("
                + ajeno + ", " + idExamen + ", " + idDocente + ", 'Copia')")).contains("fk_expulsion_asistencia");

        // Tras reprogramar (cierre de sesión posterior), la expulsión queda en la sesión anterior.
        java.time.LocalDateTime cierre = guardada.getFechaHora().plusMinutes(1);
        assertThat(expulsionRepository.expulsadoEnSesionActual(expulsado, idExamen, cierre)).isFalse();
        assertThat(expulsionRepository.deSesionActual(idExamen, cierre)).isEmpty();
    }

    /** Ejecuta un SQL que debe fallar sin anular la transacción de la prueba; devuelve el mensaje del error. */
    private String errorSql(String sql) {
        jdbc.execute("SAVEPOINT antes_del_error");
        try {
            jdbc.execute(sql);
            return "(no falló)";
        } catch (org.springframework.dao.DataAccessException e) {
            return e.getMostSpecificCause().getMessage();
        } finally {
            jdbc.execute("ROLLBACK TO SAVEPOINT antes_del_error");
        }
    }

    @Test
    void elTrasladoDeAmbienteGuardaOrigenYDestinoSinCambiarLaHoraDeIngreso() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-906");
        int idExamen = examen(paralelo, "08:00", 90);
        int trasladado = estudiante("202000061", "Ana");
        int ajeno = estudiante("202000062", "Beto");
        int aulaNueva = jdbc.queryForObject("SELECT min(id_ambiente) FROM ambiente WHERE id_ambiente <> ?", Integer.class, idAmbiente);
        jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso, id_ambiente_ingreso) "
                + "VALUES (?, ?, ?, true, TIMESTAMP '2026-10-20 07:55:00', ?)", trasladado, idExamen, paralelo, idAmbiente);

        // El servicio de Fernando: guarda el traslado y cambia el aula sin tocar la hora de ingreso.
        com.nexacore.examenes.models.TrasladoAmbiente traslado = new com.nexacore.examenes.models.TrasladoAmbiente();
        traslado.setIdExamen(idExamen);
        traslado.setIdEstudiante(trasladado);
        traslado.setIdAmbienteOrigen(idAmbiente);
        traslado.setIdAmbienteDestino(aulaNueva);
        traslado.setMotivo("Computadora dañada");
        traslado.setIdUsuarioAdmin(idDocente);
        Integer id = trasladoRepository.saveAndFlush(traslado).getId();
        jdbc.update("UPDATE asistencia_examen SET id_ambiente_ingreso = ? WHERE id_estudiante = ? AND id_examen = ?",
                aulaNueva, trasladado, idExamen);
        sincronizar();

        var guardado = trasladoRepository.findById(id).orElseThrow();
        assertThat(guardado.getFechaHoraTraslado()).isNotNull();
        assertThat(jdbc.queryForMap("SELECT id_ambiente_ingreso, fecha_hora_ingreso FROM asistencia_examen WHERE id_estudiante = ?", trasladado))
                .containsEntry("id_ambiente_ingreso", aulaNueva)
                .containsEntry("fecha_hora_ingreso", java.sql.Timestamp.valueOf("2026-10-20 07:55:00"));
        assertThat(trasladoRepository.delEstudianteEnSesionActual(idExamen, trasladado, null))
                .singleElement().satisfies(t -> assertThat(t.getIdAmbienteOrigen()).isEqualTo(idAmbiente));
        assertThat(trasladoRepository.deSesionActual(idExamen, null)).hasSize(1);

        // La lista del control muestra "Trasladado desde [aula original]" a todo el personal (viene del servidor).
        String aulaOriginal = jdbc.queryForObject("SELECT nombre FROM ambiente WHERE id_ambiente = ?", String.class, idAmbiente);
        assertThat(identificacionService.listarAsignados(idExamen, "TODOS", 0, 10).contenido())
                .filteredOn(e -> e.idEstudiante() == trasladado).singleElement()
                .satisfies(e -> {
                    assertThat(e.trasladadoDesde()).isEqualTo(aulaOriginal);
                    assertThat(e.trasladadoA()).isEqualTo(jdbc.queryForObject("SELECT nombre FROM ambiente WHERE id_ambiente = ?", String.class, aulaNueva));
                });

        // Motivo obligatorio, aulas distintas y solo estudiantes asociados al examen.
        String insertar = "INSERT INTO traslado_ambiente (id_examen, id_estudiante, id_ambiente_origen, id_ambiente_destino, motivo, id_usuario_admin) VALUES (";
        assertThat(errorSql(insertar + idExamen + ", " + trasladado + ", " + idAmbiente + ", " + aulaNueva + ", '  ', " + idDocente + ")"))
                .contains("ck_ta_motivo");
        assertThat(errorSql(insertar + idExamen + ", " + trasladado + ", " + aulaNueva + ", " + aulaNueva + ", 'Red caída', " + idDocente + ")"))
                .contains("ck_ta_aulas_distintas");
        assertThat(errorSql(insertar + idExamen + ", " + ajeno + ", " + idAmbiente + ", " + aulaNueva + ", 'Red caída', " + idDocente + ")"))
                .contains("fk_ta_asistencia");

        // Tras reprogramar (cierre de sesión posterior), el traslado queda en la sesión anterior.
        java.time.LocalDateTime cierre = guardado.getFechaHoraTraslado().plusMinutes(1);
        assertThat(trasladoRepository.deSesionActual(idExamen, cierre)).isEmpty();
    }

    @Test
    void losRegistrosGuardanLaHoraRealYNoLaDelInicioDeLaTransaccion() {
        // V45: con NOW() todo lo guardado en una transacción tenía la misma hora (la de su inicio).
        var columnas = jdbc.queryForList("""
                SELECT table_name || '.' || column_name AS columna, column_default FROM information_schema.columns
                WHERE (table_name, column_name) IN (('registro_control_ingreso', 'fecha_hora'), ('intento_ingreso', 'fecha_hora'),
                    ('incidencia', 'fecha_hora'), ('reporte_qr_duplicado', 'fecha_hora_servidor'),
                    ('excepcion_no_habilitado', 'fecha_hora'), ('traslado_ambiente', 'fecha_hora_traslado'),
                    ('expulsion', 'fecha_hora'))
                """);
        assertThat(columnas).hasSize(7)
                .allSatisfy(c -> assertThat((String) c.get("column_default")).contains("clock_timestamp()"));

        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-907");
        int idExamen = examen(paralelo, "08:00", 90);
        int idEstudiante = estudiante("202000071", "Ana");
        String intento = "INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, id_estudiante, observacion) "
                + "VALUES (?, ?, ?, '202000071', ?, 'Prueba de hora real')";
        jdbc.update(intento, idExamen, paralelo, idDocente, idEstudiante);
        jdbc.execute("SELECT pg_sleep(0.05)");
        jdbc.update(intento, idExamen, paralelo, idDocente, idEstudiante);

        var horas = jdbc.queryForList("SELECT fecha_hora FROM intento_ingreso WHERE id_examen = ? ORDER BY id_intento",
                java.sql.Timestamp.class, idExamen);
        assertThat(horas).hasSize(2);
        assertThat(horas.get(1)).isAfter(horas.get(0));
        assertThat(asistenciaRepositoryHora()).isAfter(horas.get(1).toLocalDateTime());
    }

    private java.time.LocalDateTime asistenciaRepositoryHora() {
        jdbc.execute("SELECT pg_sleep(0.01)");
        return asistenciaExamenRepository.obtenerFechaHoraServidor();
    }

    private void prepararCatalogo() {
        jdbc.update("""
                INSERT INTO usuario (nombre, apellidos, ci, email, password, estado)
                VALUES ('Luis', 'Paz', '5555555', 'luis.paz@umss.edu', 'x', 'activo')
                """);
        idDocente = jdbc.queryForObject("SELECT id_usuario FROM usuario WHERE email = 'luis.paz@umss.edu'", Integer.class);
        jdbc.update("INSERT INTO docente (id_usuario, categoria) VALUES (?, 'INTERINO')", idDocente);
        idAmbiente = jdbc.queryForObject("SELECT min(id_ambiente) FROM ambiente", Integer.class);
    }

    @Test
    void ingresoManualPersisteLaEvidenciaYSeConsultaComoExcepcion() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-MANUAL");
        int examen = examenPorEmpezar(paralelo, 90);
        int estudiante = estudiante("202104099", "Ana");
        habilitacionService.asociar(examen, paralelo, "202104099");
        jdbc.update("UPDATE asistencia_examen SET habilitado = TRUE WHERE id_estudiante = ? AND id_examen = ?", estudiante, examen);
        // Sin foto el control no puede autorizar el ingreso.
        jdbc.update("INSERT INTO estudiante_foto (id_estudiante, contenido, tipo_contenido, actualizado_en) "
                + "VALUES (?, ?, 'image/jpeg', NOW())", estudiante, new byte[]{(byte) 0xFF, (byte) 0xD8});
        sincronizar();
        var request = new com.nexacore.examenes.dto.AutorizarIngresoRequest(estudiante, examen, null, true,
                List.of("CI verificado"), List.of(), null, null, true, "Celular apagado no presenta qr");
        assertThat(controlIngresoService.autorizar(request, "luis.paz@umss.edu").autorizado()).isTrue();
        sincronizar();
        assertThat(controlIngresoService.consultarRegistrosExamen(examen)).singleElement().satisfies(registro -> {
            assertThat(registro.tipoIngreso()).isEqualTo("MANUAL");
            assertThat(registro.justificacionManual()).isEqualTo("Celular apagado no presenta qr");
            assertThat(registro.usuarioControl()).isEqualTo("Luis Paz");
            assertThat(registro.estudiante()).isEqualTo("Ana Prueba");
            assertThat(registro.fechaHora()).isNotNull();
        });
    }

    private int materiaYParalelo(String sigla) {
        jdbc.update("INSERT INTO materia (sigla, nombre) VALUES (?, ?)", sigla, "Materia " + sigla);
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM materia WHERE sigla = ?", Integer.class, sigla);
        jdbc.update("INSERT INTO paralelo (id_materia, id_docente, nombre_grupo) VALUES (?, ?, '1')", idMateria, idDocente);
        return jdbc.queryForObject("SELECT id_paralelo FROM paralelo WHERE id_materia = ?", Integer.class, idMateria);
    }

    /** Examen de mañana; devuelve id_examen. */
    private int examen(int paralelo, String hora, int duracion) {
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, paralelo);
        return jdbc.queryForObject("""
                INSERT INTO examen (id_paralelo, fecha, hora_inicio, duracion_minutos, id_materia, id_docente, id_ambiente)
                VALUES (?, CURRENT_DATE + 1, CAST(? AS time), ?, ?, ?, ?) RETURNING id_examen
                """, Integer.class, paralelo, hora, duracion, idMateria, idDocente, idAmbiente);
    }

    /** Examen que empieza en 5 minutos (hora de la base): el control de ingreso ya está abierto. */
    private int examenPorEmpezar(int paralelo, int duracion) {
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, paralelo);
        return jdbc.queryForObject("""
                INSERT INTO examen (id_paralelo, fecha, hora_inicio, duracion_minutos, id_materia, id_docente, id_ambiente)
                SELECT ?, CAST(t AS date), CAST(t AS time(0)), ?, ?, ?, ?
                FROM (SELECT CAST(clock_timestamp() AS timestamp) + INTERVAL '5 minutes' AS t) ahora
                RETURNING id_examen
                """, Integer.class, paralelo, duracion, idMateria, idDocente, idAmbiente);
    }

    private int estudiante(String sis, String nombre) {
        jdbc.update("INSERT INTO estudiante (codigo_sis, nombre, apellidos, ci, email) VALUES (?, ?, 'Prueba', ?, ?)",
                sis, nombre, sis.substring(2), sis + "@est.umss.edu");
        return jdbc.queryForObject("SELECT id_estudiante FROM estudiante WHERE codigo_sis = ?", Integer.class, sis);
    }

    @Test
    void elPortalDelEstudianteMuestraSusNormasYSiFueExpulsado() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-908");
        int idExamen = examen(paralelo, "08:00", 90);
        int ana = estudiante("202000081", "Ana");
        int luis = estudiante("202000082", "Luis");
        String correoAna = cuentaDeEstudiante(ana, "202000081@est.umss.edu");
        String correoLuis = cuentaDeEstudiante(luis, "202000082@est.umss.edu");
        habilitacionService.asociar(idExamen, paralelo, "202000081");
        habilitacionService.asociar(idExamen, paralelo, "202000082");
        var examen = examenRepository.findAll().stream()
                .filter(x -> x.getId().getIdExamen() == idExamen).findFirst().orElseThrow();
        normasExamenService.actualizar(examen, List.of("Presentar CI vigente", "No usar celular"), List.of(
                new com.nexacore.examenes.dto.NormaParticularRequest("Ana Prueba", "Tiempo adicional de 15 minutos", ana),
                new com.nexacore.examenes.dto.NormaParticularRequest("Luis Prueba", "Asiento cerca de la puerta", luis)));
        // Ana ingresó y después la expulsaron (INCI-01).
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_ingreso = NOW(), id_ambiente_ingreso = ? WHERE id_estudiante = ? AND id_examen = ?",
                idAmbiente, ana, idExamen);
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo) VALUES (?, ?, ?, 'Copia durante el examen')",
                ana, idExamen, idDocente);
        sincronizar();

        assertThat(panelEstudianteService.examenes(correoAna)).singleElement().satisfies(e -> {
            assertThat(e.normasGenerales()).containsExactly("Presentar CI vigente", "No usar celular");
            // Solo sus adaptaciones: nunca las de otro estudiante.
            assertThat(e.normasParticulares()).containsExactly("Tiempo adicional de 15 minutos");
            assertThat(e.expulsado()).isTrue();
            // Su cronómetro se detiene en la hora oficial de la expulsión.
            assertThat(e.fechaHoraExpulsion()).isNotNull();
            assertThat(e.fechaHoraIngreso()).isNotNull();
        });
        assertThat(panelEstudianteService.examenes(correoLuis)).singleElement().satisfies(e -> {
            assertThat(e.normasParticulares()).containsExactly("Asiento cerca de la puerta");
            assertThat(e.expulsado()).isFalse();
            assertThat(e.fechaHoraExpulsion()).isNull();
        });

        // Si el examen se reprograma, la expulsión queda en la sesión anterior.
        sesionExamenService.archivarYReiniciar(examen, idDocente, "Corte de luz");
        sincronizar();
        assertThat(panelEstudianteService.examenes(correoAna)).singleElement()
                .satisfies(e -> assertThat(e.expulsado()).isFalse());
    }

    @Test
    void unaExpulsionPorErrorSeAnulaSinBorrarseYElEstudianteSigueConSuExamen() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-941");
        int idExamen = examenPorEmpezar(paralelo, 90);
        int ana = estudiante("202000141", "Ana");
        String correoAna = cuentaDeEstudiante(ana, "202000141@est.umss.edu");
        habilitacionService.asociar(idExamen, paralelo, "202000141");
        jdbc.update("UPDATE asistencia_examen SET habilitado = TRUE, fecha_hora_ingreso = NOW(), id_ambiente_ingreso = ? WHERE id_estudiante = ? AND id_examen = ?",
                idAmbiente, ana, idExamen);
        sincronizar();
        var admin = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("luis.paz@umss.edu", null,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")));

        var expulsion = controlIngresoService.expulsar(new com.nexacore.examenes.dto.ExpulsarEstudianteRequest(ana, idExamen, "Uso de celular"), admin);
        sincronizar();
        assertThat(panelEstudianteService.examenes(correoAna)).singleElement().satisfies(e -> assertThat(e.expulsado()).isTrue());

        var anulada = controlIngresoService.anularExpulsion(idExamen, expulsion.idExpulsion(), "Error del control, era otro estudiante", admin);
        sincronizar();
        assertThat(anulada.anuladaEn()).isNotNull();
        assertThat(anulada.anuladaPor()).isEqualTo("Luis Paz");
        // Sigue con su examen: el portal ya no lo muestra expulsado y se lo puede trasladar.
        assertThat(panelEstudianteService.examenes(correoAna)).singleElement().satisfies(e -> {
            assertThat(e.expulsado()).isFalse();
            assertThat(e.fechaHoraExpulsion()).isNull();
        });
        assertThat(expulsionRepository.expulsadoEnSesionActual(ana, idExamen, null)).isFalse();
        // El registro no se borra: queda en el reporte como anulado.
        assertThat(expulsionConsultaService.listar(idExamen)).singleElement().satisfies(x -> {
            assertThat(x.motivo()).isEqualTo("Uso de celular");
            assertThat(x.motivoAnulacion()).isEqualTo("Error del control, era otro estudiante");
        });
        assertThat(jdbc.queryForObject("SELECT tipo FROM notificacion WHERE id_examen = ? ORDER BY id_notificacion DESC LIMIT 1", String.class, idExamen))
                .isEqualTo("EXPULSION_ANULADA");

        // No se anula dos veces, ni con un motivo corto, ni la expulsión de otro examen.
        assertThatThrownBy(() -> controlIngresoService.anularExpulsion(idExamen, expulsion.idExpulsion(), "Otra vez por error", admin))
                .hasMessageContaining("ya fue anulada");
        assertThatThrownBy(() -> controlIngresoService.anularExpulsion(idExamen, expulsion.idExpulsion(), "corto", admin))
                .hasMessageContaining("al menos 10 caracteres");
        assertThatThrownBy(() -> controlIngresoService.anularExpulsion(idExamen + 1000, expulsion.idExpulsion(), "Error del control", admin))
                .hasMessageContaining("No se encontró la expulsión");
        // La base impide cambiar la anulación o la expulsión registrada.
        assertThat(errorSql("UPDATE expulsion SET motivo_anulacion = 'Cambiado' WHERE id_expulsion = " + expulsion.idExpulsion()))
                .contains("La anulación de la expulsión no se puede modificar");
        assertThat(errorSql("UPDATE expulsion SET anulada_en = NULL, id_usuario_anula = NULL WHERE id_expulsion = " + expulsion.idExpulsion()))
                .contains("no se puede modificar");

        // Si de verdad corresponde, se lo puede volver a expulsar.
        controlIngresoService.expulsar(new com.nexacore.examenes.dto.ExpulsarEstudianteRequest(ana, idExamen, "Copia durante el examen"), admin);
        assertThat(expulsionRepository.expulsadoEnSesionActual(ana, idExamen, null)).isTrue();
    }

    @Test
    void laExpulsionElIngresoManualYLaExcepcionNotificanAlPersonal() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-909");
        int idExamen = examenPorEmpezar(paralelo, 90);
        int ana = estudiante("202000091", "Ana");
        int beto = estudiante("202000092", "Beto");
        int carla = estudiante("202000093", "Carla");
        habilitacionService.asociar(idExamen, paralelo, "202000091");
        habilitacionService.asociar(idExamen, paralelo, "202000092");
        habilitacionService.asociar(idExamen, paralelo, "202000093");
        jdbc.update("UPDATE asistencia_examen SET habilitado = TRUE WHERE id_examen = ? AND id_estudiante IN (?, ?)", idExamen, ana, beto);
        jdbc.update("INSERT INTO estudiante_foto (id_estudiante, contenido, tipo_contenido, actualizado_en) VALUES (?, ?, 'image/jpeg', NOW())",
                beto, new byte[]{(byte) 0xFF, (byte) 0xD8});
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_ingreso = NOW(), id_ambiente_ingreso = ? WHERE id_estudiante = ? AND id_examen = ?",
                idAmbiente, ana, idExamen);
        sincronizar();
        var admin = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("luis.paz@umss.edu", null,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")));

        // INCI-03: el control traslada a Ana; avisa al personal y su portal muestra el aula nueva y la original.
        String correoAna = cuentaDeEstudiante(ana, "202000091@est.umss.edu");
        int aulaNueva = jdbc.queryForObject("SELECT min(id_ambiente) FROM ambiente WHERE id_ambiente <> ?", Integer.class, idAmbiente);
        controlIngresoService.reasignarAmbiente(idExamen, ana,
                new com.nexacore.examenes.dto.ReasignarAmbienteRequest(aulaNueva, "Computadora dañada", null), "luis.paz@umss.edu");
        sincronizar();
        String aulaOriginal = jdbc.queryForObject("SELECT nombre FROM ambiente WHERE id_ambiente = ?", String.class, idAmbiente);
        String aulaDestino = jdbc.queryForObject("SELECT nombre FROM ambiente WHERE id_ambiente = ?", String.class, aulaNueva);
        assertThat(panelEstudianteService.examenes(correoAna)).singleElement().satisfies(e -> {
            assertThat(e.aula()).isEqualTo(aulaDestino);
            assertThat(e.trasladadoDesde()).isEqualTo(aulaOriginal);
        });

        controlIngresoService.expulsar(new com.nexacore.examenes.dto.ExpulsarEstudianteRequest(ana, idExamen, "Copia durante el examen"), admin);
        controlIngresoService.autorizar(new com.nexacore.examenes.dto.AutorizarIngresoRequest(beto, idExamen, null, true,
                List.of("CI verificado"), List.of(), null, null, true, "Celular apagado no presenta qr"), "luis.paz@umss.edu");
        excepcionService.registrarExcepcion(new com.nexacore.examenes.dto.RegistrarExceptionRequest(carla, idExamen, idAmbiente,
                "Pendiente de habilitación", "Se le permitió esperar afuera", null), "luis.paz@umss.edu");
        sincronizar();

        // INCI-04: el reporte de excepciones del examen, con nombres y la sesión actual.
        assertThat(excepcionService.listar(idExamen)).singleElement().satisfies(x -> {
            assertThat(x.estudiante()).isEqualTo("Carla Prueba");
            assertThat(x.codigoSis()).isEqualTo("202000093");
            assertThat(x.accionTomada()).isEqualTo("Se le permitió esperar afuera");
            assertThat(x.registradoPor()).isEqualTo("Luis Paz");
            assertThat(x.ambiente()).isNotBlank();
            assertThat(x.fechaHora()).isNotNull();
        });

        var avisos = jdbc.queryForList("SELECT tipo, titulo, detalle, id_estudiante, enlace FROM notificacion WHERE id_examen = ? ORDER BY id_notificacion", idExamen);
        assertThat(avisos).extracting(a -> a.get("tipo"))
                .containsExactly("TRASLADO_AMBIENTE", "EXPULSION", "INGRESO_MANUAL", "EXCEPCION_NO_HABILITADO");
        assertThat(avisos.get(0)).containsEntry("titulo", "Traslado: Ana Prueba").containsEntry("id_estudiante", ana)
                .containsEntry("enlace", "/dashboard/control/" + idExamen + "/informacion");
        assertThat((String) avisos.get(0).get("detalle"))
                .contains("De " + aulaOriginal + " a " + aulaDestino).contains("Computadora dañada").contains("Luis Paz");
        assertThat(avisos.get(1)).containsEntry("titulo", "Expulsión: Ana Prueba").containsEntry("id_estudiante", ana)
                .containsEntry("enlace", "/dashboard/control/" + idExamen + "/informacion");
        assertThat((String) avisos.get(1).get("detalle")).contains("Materia TST-909").contains("Copia durante el examen");
        assertThat((String) avisos.get(2).get("detalle")).contains("Celular apagado no presenta qr");
        assertThat((String) avisos.get(3).get("detalle")).contains("Se le permitió esperar afuera");
    }

    @Test
    void elReporteDeIntentosIncorrectosListaTodosLosExamenesYFiltraPorUno() {
        // DASH-06 / HU#7.
        prepararCatalogo();
        int p1 = materiaYParalelo("TST-931");
        int p2 = materiaYParalelo("TST-932");
        int examen1 = examen(p1, "08:00", 90);
        int examen2 = examen(p2, "10:00", 90);
        int ana = estudiante("202000131", "Ana");
        String insertar = "INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, id_estudiante, observacion, fecha_hora) VALUES (?, ?, ?, ?, ?, ?, ?)";
        jdbc.update(insertar, examen1, p1, idDocente, "202000131", ana, "No está inscrito en la materia",
                java.sql.Timestamp.valueOf("2026-10-28 08:05:00"));
        jdbc.update(insertar, examen2, p2, idDocente, "202000131", ana, "Ambiente incorrecto: se presentó en el aula 691B",
                java.sql.Timestamp.valueOf("2026-10-28 10:07:00"));
        jdbc.update(insertar, examen1, p1, idDocente, "9999999", null, "QR de otra persona",
                java.sql.Timestamp.valueOf("2026-10-28 08:09:00"));
        sincronizar();

        var todos = intentoIngresoService.reporte(null, 0, 20);
        assertThat(todos.totalRegistros()).isGreaterThanOrEqualTo(3);
        var mios = todos.contenido().stream().filter(i -> i.idExamen() == examen1 || i.idExamen() == examen2).toList();
        assertThat(mios).extracting(i -> i.fechaHora().toLocalTime().toString()).containsExactly("10:07", "08:09", "08:05");
        assertThat(mios.get(0)).satisfies(i -> {
            assertThat(i.tipo()).isEqualTo("AULA_INCORRECTA");
            assertThat(i.examen()).isEqualTo("Materia TST-932");
            assertThat(i.estudiante()).isEqualTo("Ana Prueba");
            assertThat(i.personalControl()).isNotBlank();
            assertThat(i.horaExamen()).hasToString("10:00");
        });
        // Sin estudiante identificado: queda el identificador que se escaneó.
        assertThat(mios.get(1)).satisfies(i -> {
            assertThat(i.estudiante()).isNull();
            assertThat(i.identificador()).isEqualTo("9999999");
            assertThat(i.tipo()).isEqualTo("NO_CORRESPONDE");
        });

        var soloExamen1 = intentoIngresoService.reporte(examen1, 0, 20);
        assertThat(soloExamen1.totalRegistros()).isEqualTo(2);
        assertThat(soloExamen1.contenido()).allSatisfy(i -> assertThat(i.idExamen()).isEqualTo(examen1));
        assertThat(intentoIngresoService.reporte(examen1, 0, 1).totalPaginas()).isEqualTo(2);
        assertThatThrownBy(() -> intentoIngresoService.reporte(999999, 0, 20)).hasMessageContaining("No se encontró el examen");
        assertThatThrownBy(() -> intentoIngresoService.reporte(null, 0, 500)).hasMessageContaining("tamaño de página");
    }

    /** Cuenta de usuario del estudiante (CTA-01) para entrar a su portal. */
    private String cuentaDeEstudiante(int idEstudiante, String correo) {
        Integer idUsuario = jdbc.queryForObject("""
                INSERT INTO usuario (nombre, apellidos, ci, email, password, estado)
                VALUES ('Est', 'Prueba', ?, ?, 'x', 'activo') RETURNING id_usuario
                """, Integer.class, correo.substring(2, 9), correo);
        jdbc.update("UPDATE estudiante SET id_usuario = ? WHERE id_estudiante = ?", idUsuario, idEstudiante);
        return correo;
    }

    @Test
    void avisaSiElEstudianteTieneOtroExamenALaMismaHora() {
        prepararCatalogo();
        int p1 = materiaYParalelo("TST-901");
        int p2 = materiaYParalelo("TST-902");
        int examenA = examen(p1, "08:00", 90);
        int examenB = examen(p2, "09:00", 60);   // se cruza con A
        estudiante("202104010", "Ana");
        estudiante("202104011", "Luis");
        habilitacionService.asociar(examenB, p2, "202104010");

        var lista = habilitacionService.asociarLote(examenA, p1, List.of("202104010", "202104011")).estudiantes();

        assertThat(lista).filteredOn(e -> e.codigoSis().equals("202104010")).singleElement()
                .satisfies(e -> assertThat(e.conflictoHorario()).contains("TST-902").contains("09:00"));
        assertThat(lista).filteredOn(e -> e.codigoSis().equals("202104011")).singleElement()
                .satisfies(e -> assertThat(e.conflictoHorario()).isNull());
    }

    @Test
    void lasNormasViveEnSuTablaYSoloSonParaEstudiantesDelExamen() {
        prepararCatalogo();
        int p1 = materiaYParalelo("TST-901");
        int idExamen = examen(p1, "08:00", 90);
        int ana = estudiante("202104010", "Ana");
        int luis = estudiante("202104011", "Luis");
        habilitacionService.asociar(idExamen, p1, "202104010");
        var examen = examenRepository.findAll().stream()
                .filter(x -> x.getId().getIdExamen() == idExamen).findFirst().orElseThrow();

        // Luis no está asociado: no se le puede poner una norma particular.
        assertThatThrownBy(() -> normasExamenService.actualizar(examen, List.of(),
                List.of(new com.nexacore.examenes.dto.NormaParticularRequest("Luis Prueba", "Tiempo adicional de 15 minutos", luis))))
                .hasMessageContaining("no está asociado a este examen");

        normasExamenService.actualizar(examen, List.of("Presentar CI vigente", "No usar celular"),
                List.of(new com.nexacore.examenes.dto.NormaParticularRequest("Ana Prueba", "Tiempo adicional de 15 minutos", ana)));
        assertThat(normasExamenService.leer(idExamen).generales()).containsExactly("Presentar CI vigente", "No usar celular");
        assertThat(normasExamenService.leerParaEstudiante(idExamen, ana, "Ana Prueba").particulares())
                .containsExactly("Tiempo adicional de 15 minutos");
        assertThat(normasExamenService.leerParaEstudiante(idExamen, luis, "Ana Prueba").particulares()).isEmpty();

        // Quitar una norma la deja inactiva como historial, no la borra.
        normasExamenService.actualizar(examen, List.of("Presentar CI vigente"), normasExamenService.leer(idExamen).particulares());
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM norma_examen WHERE id_examen = ? AND NOT activa AND texto = 'No usar celular'",
                Integer.class, idExamen)).isEqualTo(1);
    }

    @Test
    void seQuitaAlEstudianteAsociadoPorErrorSoloSiNoPasoPorElControl() {
        prepararCatalogo();
        int p1 = materiaYParalelo("TST-901");
        int idExamen = examen(p1, "08:00", 90);
        int ana = estudiante("202104010", "Ana");
        int luis = estudiante("202104011", "Luis");
        int rosa = estudiante("202104012", "Rosa");
        habilitacionService.asociarLote(idExamen, p1, List.of("202104010", "202104011", "202104012"));
        var examen = examenRepository.findAll().stream()
                .filter(x -> x.getId().getIdExamen() == idExamen).findFirst().orElseThrow();
        normasExamenService.actualizar(examen, List.of(),
                List.of(new com.nexacore.examenes.dto.NormaParticularRequest("Ana Prueba", "Tiempo adicional de 15 minutos", ana)));

        // Luis ya ingresó y Rosa tiene un intento registrado: no se los puede quitar.
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_ingreso = now() WHERE id_estudiante = ?", luis);
        jdbc.update("""
                INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, id_estudiante)
                VALUES (?, ?, ?, '202104012', ?)
                """, idExamen, p1, idDocente, rosa);
        sincronizar();
        assertThatThrownBy(() -> habilitacionService.quitar(idExamen, p1, luis)).hasMessageContaining("ya ingresó");
        assertThatThrownBy(() -> habilitacionService.quitar(idExamen, p1, rosa)).hasMessageContaining("registros del control");

        var lista = habilitacionService.quitar(idExamen, p1, ana);

        assertThat(lista).extracting(r -> r.codigoSis()).containsExactlyInAnyOrder("202104011", "202104012");
        assertThat(lista).filteredOn(r -> r.codigoSis().equals("202104011")).singleElement()
                .satisfies(r -> assertThat(r.ingresado()).isTrue());
        assertThat(normasExamenService.leerParaEstudiante(idExamen, ana, "Ana Prueba").particulares()).isEmpty();
    }

    // ---------- INCI-04: tabla de excepciones de no habilitados (V39) ----------

    @Test
    void laExcepcionDeNoHabilitadoGuardaLaHoraDelServidorYExigeSusDatos() {
        prepararCatalogo();
        int p1 = materiaYParalelo("TST-903");
        int idExamen = examen(p1, "08:00", 90);
        int ana = estudiante("202104020", "Ana");

        var excepcion = new com.nexacore.examenes.models.ExcepcionNoHabilitado();
        excepcion.setIdEstudiante(ana);
        excepcion.setIdExamen(idExamen);
        excepcion.setIdAmbiente(idAmbiente);
        excepcion.setIdUsuarioControl(idDocente);
        excepcion.setMotivoInhabilitacion("No pagó la matrícula");
        excepcion.setAccionTomada("Se le informó que no está habilitado");
        excepcionRepository.saveAndFlush(excepcion);
        sincronizar();

        var guardadas = excepcionRepository.findByIdExamenOrderByFechaHoraDesc(idExamen);
        assertThat(guardadas).singleElement().satisfies(e -> {
            assertThat(e.getFechaHora()).isNotNull();
            assertThat(e.getObservaciones()).isNull();
            assertThat(e.getIdAmbiente()).isEqualTo(idAmbiente);
        });
        // La acción tomada es obligatoria y no puede quedar vacía.
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO excepcion_no_habilitado
                    (id_estudiante, id_examen, id_ambiente, id_usuario_control, motivo_inhabilitacion, accion_tomada)
                VALUES (?, ?, ?, ?, 'No pagó la matrícula', '   ')
                """, ana, idExamen, idAmbiente, idDocente))
                .hasMessageContaining("ck_excepcion_accion");
    }
}
