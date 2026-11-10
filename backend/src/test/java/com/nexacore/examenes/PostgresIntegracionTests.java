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
    @Autowired com.nexacore.examenes.services.ExpulsionConsultaService expulsionConsultaService;
    @Autowired com.nexacore.examenes.services.InicioAdminService inicioAdminService;
    @Autowired com.nexacore.examenes.services.DocenteMateriaService docenteMateriaService;
    @Autowired com.nexacore.examenes.services.ImportacionEstudiantesService importacionEstudiantesService;
    @Autowired com.nexacore.examenes.services.PlanillaEstudiantesService planillaEstudiantesService;
    @Autowired com.nexacore.examenes.services.ExpulsionEvidenciaService expulsionEvidenciaService;
    @Autowired com.nexacore.examenes.services.AforoService aforoService;
    @Autowired com.nexacore.examenes.services.IngresosRecientesService ingresosRecientesService;
    @Autowired com.nexacore.examenes.services.SalidaExamenService salidaExamenService;
    @Autowired com.nexacore.examenes.services.UsuarioService usuarioService;
    @Autowired com.nexacore.examenes.services.RespaldoEstadoService respaldoEstadoService;
    @Autowired com.nexacore.examenes.services.InicioControlService inicioControlService;
    @Autowired com.nexacore.examenes.services.ExamenControlService examenControlService;
    @Autowired com.nexacore.examenes.services.PerfilRolService perfilRolService;
    @Autowired com.nexacore.examenes.services.InicioDocenteService inicioDocenteService;
    @Autowired com.nexacore.examenes.services.AsistenciaExportService asistenciaExportService;
    @Autowired com.nexacore.examenes.services.UsuarioFotoService usuarioFotoService;
    @Autowired com.nexacore.examenes.services.FotoRevisionAcceso fotoRevisionAcceso;
    @Autowired com.nexacore.examenes.services.ReporteFotosService reporteFotosService;
    @Autowired com.nexacore.examenes.services.EstudianteFotoService estudianteFotoService;
    @Autowired com.nexacore.examenes.services.IntentoIngresoService intentoIngresoService;
    @Autowired com.nexacore.examenes.services.ControlIngresoService controlIngresoService;
    @Autowired com.nexacore.examenes.repositories.NotificacionRepository notificacionRepository;
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
    void controlUsaHoraBolivianaInclusoConSesionPostgresEnUtc() {
        jdbc.execute("SET LOCAL TIME ZONE 'UTC'");
        var hora = asistenciaExamenRepository.obtenerFechaHoraServidor();
        var bolivia = java.time.LocalDateTime.now(java.time.ZoneId.of("America/La_Paz"));
        assertThat(Math.abs(java.time.Duration.between(hora, bolivia).toMillis())).isLessThan(2000);
    }

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
    void elCatalogoDePermisosDeLaBaseCoincideConElDelCodigo() {
        // rol_permiso apunta a permiso: un permiso del código que falte en la base no se podría asignar.
        List<String> enBase = jdbc.queryForList("SELECT codigo || '|' || modulo || '|' || descripcion FROM permiso", String.class);
        assertThat(enBase).containsExactlyInAnyOrderElementsOf(Arrays.stream(com.nexacore.examenes.security.Permiso.values())
                .map(p -> p.name() + "|" + p.modulo() + "|" + p.descripcion()).toList());
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
                        60, "Otra vez por un corte de luz"), "luis.paz@umss.edu"))
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
                    // El nombre del aula de ingreso llega con la fila: el CONTROL no puede listar las aulas.
                    assertThat(e.aulaIngreso()).isEqualTo(jdbc.queryForObject("SELECT nombre FROM ambiente WHERE id_ambiente = ?", String.class, aulaNueva));
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
        // Los defaults timestamp y la consulta de control se comparan en la misma zona de negocio.
        jdbc.execute("SET LOCAL TIME ZONE 'America/La_Paz'");
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

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"UTC", "America/La_Paz"})
    void ingresoManualPersisteLaEvidenciaYSeConsultaComoExcepcion(String zonaBase) {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-MANUAL");
        int examen = examen(paralelo, "08:00", 90);
        int estudiante = estudiante("202104099", "Ana");
        habilitacionService.asociar(examen, paralelo, "202104099");
        jdbc.update("UPDATE asistencia_examen SET habilitado = TRUE WHERE id_estudiante = ? AND id_examen = ?", estudiante, examen);
        // Sin foto el control no puede autorizar el ingreso.
        jdbc.update("INSERT INTO estudiante_foto (id_estudiante, contenido, tipo_contenido, actualizado_en) "
                + "VALUES (?, ?, 'image/jpeg', NOW())", estudiante, new byte[]{(byte) 0xFF, (byte) 0xD8});
        sincronizar();
        // Caso de la captura: empezó hace 40 minutos y dura 190; sigue en curso hasta dentro de 150.
        var ahoraBolivia = java.time.LocalDateTime.now(java.time.ZoneId.of("America/La_Paz"));
        var inicio = ahoraBolivia.minusMinutes(40);
        jdbc.update("UPDATE examen SET fecha = ?, hora_inicio = ?, duracion_minutos = 190 WHERE id_examen = ?",
                inicio.toLocalDate(), inicio.toLocalTime(), examen);
        sincronizar();
        jdbc.execute("SET LOCAL TIME ZONE '" + zonaBase + "'");
        var request = new com.nexacore.examenes.dto.AutorizarIngresoRequest(estudiante, examen, null, true,
                List.of("CI verificado"), List.of(new com.nexacore.examenes.dto.IncidenciaIngresoRequest(
                        jdbc.queryForObject("SELECT id_tipo_incidencia FROM catalogo_incidencia WHERE nombre = 'OTRA_INCIDENCIA'", Integer.class),
                        "Documento deteriorado")), null, null, true, "Celular apagado no presenta qr");
        assertThat(controlIngresoService.autorizar(request, "luis.paz@umss.edu").autorizado()).isTrue();
        sincronizar();
        var horaGuardada = asistenciaExamenRepository.obtenerFechaHoraIngreso(estudiante, examen);
        assertThat(Math.abs(java.time.Duration.between(ahoraBolivia, horaGuardada).toMillis())).isLessThan(5000);
        assertThat(controlIngresoService.consultarRegistrosExamen(examen)).singleElement().satisfies(registro -> {
            assertThat(registro.incidencias()).singleElement().satisfies(i -> assertThat(i.descripcion()).isEqualTo("Documento deteriorado"));
            assertThat(registro.tipoIngreso()).isEqualTo("MANUAL");
            assertThat(registro.justificacionManual()).isEqualTo("Celular apagado no presenta qr");
            assertThat(registro.usuarioControl()).isEqualTo("Luis Paz");
            assertThat(registro.estudiante()).isEqualTo("Ana Prueba");
            assertThat(registro.fechaHora()).isNotNull();
        });
    }

    // El DOCENTE solo ve a los inscritos en sus paralelos o asociados a sus exámenes; el ADMIN, a todos.
    @Test
    void elDocenteSoloVeASusEstudiantes() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-ALC");
        int idExamen = examen(paralelo, "08:00", 90);
        int inscrito = estudiante("209999101", "Ana");
        int asociado = estudiante("209999102", "Beto");
        int ajeno = estudiante("209999103", "Ciro");
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, paralelo);
        jdbc.update("INSERT INTO inscripcion_paralelo (id_estudiante, id_paralelo, id_materia, id_docente) VALUES (?, ?, ?, ?)",
                inscrito, paralelo, idMateria, idDocente);
        jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo) VALUES (?, ?, ?)",
                asociado, idExamen, paralelo);
        sincronizar();

        assertThat(estudianteService.listar(0, 50, "209999", null, null, idDocente).contenido())
                .extracting(e -> e.id()).containsExactlyInAnyOrder(inscrito);
        assertThat(estudianteService.listar(0, 50, "209999", null, null, null).contenido())
                .extracting(e -> e.id()).containsExactlyInAnyOrder(inscrito, asociado, ajeno);
        assertThat(estudianteRepository.esDelDocente(inscrito, idDocente)).isTrue();
        assertThat(estudianteRepository.esDelDocente(asociado, idDocente)).isFalse();
        assertThat(estudianteRepository.esDelDocente(ajeno, idDocente)).isFalse();
    }

    @Test
    void materiasDelDocenteFiltranSinDuplicarNiExponerMateriasAjenas() {
        prepararCatalogo();
        int docente = idDocente;
        int p1 = materiaYParalelo("FILTRO-A");
        int p2 = materiaYParalelo("FILTRO-B");
        int m1 = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo=?", Integer.class, p1);
        int m2 = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo=?", Integer.class, p2);
        int ana = estudiante("209998101", "Ana");
        int beto = estudiante("209998102", "Beto");
        int retirado = estudiante("209998103", "Ciro");
        jdbc.update("INSERT INTO inscripcion_paralelo (id_estudiante,id_paralelo,id_materia,id_docente) VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?),(?,?,?,?)",
                ana,p1,m1,docente, ana,p2,m2,docente, beto,p2,m2,docente, retirado,p1,m1,docente);
        jdbc.update("UPDATE inscripcion_paralelo SET estado='retirado' WHERE id_estudiante=?", retirado);
        idDocente = jdbc.queryForObject("INSERT INTO usuario (nombre,apellidos,ci,email,password,estado) VALUES ('Otro','Docente','88888881','otro.filtro@umss.edu','x','activo') RETURNING id_usuario", Integer.class);
        jdbc.update("INSERT INTO docente (id_usuario,categoria) VALUES (?,'INTERINO')", idDocente);
        int p3 = materiaYParalelo("FILTRO-AJENA");
        int m3 = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo=?", Integer.class,p3);
        jdbc.update("INSERT INTO inscripcion_paralelo (id_estudiante,id_paralelo,id_materia,id_docente) VALUES (?,?,?,?)",ana,p3,m3,idDocente);
        sincronizar();
        var pagina = estudianteService.listar(0,1,"209998",null,null,docente,null,null);
        assertThat(pagina.totalRegistros()).isEqualTo(2);
        assertThat(pagina.totalPaginas()).isEqualTo(2);
        assertThat(pagina.contenido()).extracting(e -> e.id()).containsExactly(ana);
        assertThat(pagina.contenido().get(0).materiasDocente()).extracting(m -> m.idMateria()).containsExactly(m1,m2);
        assertThat(estudianteService.listar(0,10,"209998",null,null,docente,m1,p1).contenido()).extracting(e -> e.id()).containsExactly(ana);
        assertThat(estudianteService.listar(0,10,"209998",null,null,docente,m2,p2).contenido()).hasSize(2);
        assertThat(estudianteService.listar(0,10,"209998",null,null,docente,m1,p2).contenido()).isEmpty();
        assertThat(estudianteService.listar(0,10,"209998",null,null,docente,m3,null).contenido()).isEmpty();
        assertThat(estudianteRepository.esDelDocente(retirado,docente)).isFalse();
        assertThat(estudianteService.materiasDelDocente(docente)).extracting(m -> m.idMateria()).containsExactly(m1,m2);
        jdbc.update("UPDATE estudiante SET estado_matricula='NO_MATRICULADO' WHERE id_estudiante=?",ana);
        sincronizar();
        assertThat(estudianteRepository.esDelDocente(ana,docente)).isFalse();
        assertThat(estudianteService.listar(0,10,"209998",null,null,docente,m1,null).contenido()).isEmpty();
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

    /** Tras asociar estudiantes al examen futuro, abre el control con un horario boliviano. */
    private void abrirControl(int idExamen) {
        jdbc.update("""
                UPDATE examen SET fecha = CAST(t AS date), hora_inicio = CAST(t AS time(0))
                FROM (SELECT timezone('America/La_Paz', clock_timestamp()) + INTERVAL '5 minutes' AS t) ahora
                WHERE id_examen = ?
                """, idExamen);
        sincronizar();
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
        int idExamen = examen(paralelo, "08:00", 90);
        int ana = estudiante("202000141", "Ana");
        String correoAna = cuentaDeEstudiante(ana, "202000141@est.umss.edu");
        habilitacionService.asociar(idExamen, paralelo, "202000141");
        abrirControl(idExamen);
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
        int idExamen = examen(paralelo, "08:00", 90);
        int ana = estudiante("202000091", "Ana");
        int beto = estudiante("202000092", "Beto");
        int carla = estudiante("202000093", "Carla");
        habilitacionService.asociar(idExamen, paralelo, "202000091");
        habilitacionService.asociar(idExamen, paralelo, "202000092");
        habilitacionService.asociar(idExamen, paralelo, "202000093");
        abrirControl(idExamen);
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

        // DASH-01: el panel del examen cuenta traslado, expulsión, ingreso manual y excepción.
        assertThat(identificacionService.resumir(idExamen).incidencias()).isEqualTo(4);

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

        // DASH-06: el filtro por examen deja solo los intentos de su horario vigente. Si el examen se reprogramó,
        // los intentos de la sesión anterior (antes de su cierre) quedan fuera; sin filtro, el listado los conserva.
        jdbc.update("""
                INSERT INTO examen_sesion (id_examen, numero, fecha, hora_inicio, duracion_minutos, asociados, ingresaron,
                                           motivo_reprogramacion, cerrada_en)
                VALUES (?, 1, DATE '2026-10-28', TIME '08:00', 90, 0, 0, 'Corte de luz en el bloque', TIMESTAMP '2026-10-28 08:07:00')
                """, examen1);
        sincronizar();
        var vigente = intentoIngresoService.reporte(examen1, 0, 20);
        assertThat(vigente.contenido()).extracting(i -> i.fechaHora().toLocalTime().toString()).containsExactly("08:09");
        assertThat(vigente.totalRegistros()).isEqualTo(1);
        assertThat(intentoIngresoService.reporte(null, 0, 20).contenido())
                .filteredOn(i -> i.idExamen() == examen1).hasSize(2);
    }

    @Test
    void elInicioDelAdminResumeElDiaYLaSemana() {
        prepararCatalogo();
        var antes = inicioAdminService.resumen();
        var ahora = antes.ahora();
        int pa = materiaYParalelo("TST-INI1");
        int pb = materiaYParalelo("TST-INI2");
        int pc = materiaYParalelo("TST-INI3");
        int enCurso = examen(pa, "08:00", 120);
        int porIniciar = examen(pb, "08:00", 60);
        int deAyer = examen(pc, "08:00", 60);
        var inicioA = ahora.minusMinutes(30);
        var inicioB = ahora.plusMinutes(2);
        jdbc.update("UPDATE examen SET fecha = ?, hora_inicio = ? WHERE id_examen = ?", inicioA.toLocalDate(), inicioA.toLocalTime(), enCurso);
        jdbc.update("UPDATE examen SET fecha = ?, hora_inicio = ? WHERE id_examen = ?", inicioB.toLocalDate(), inicioB.toLocalTime(), porIniciar);
        jdbc.update("UPDATE examen SET fecha = ? WHERE id_examen = ?", ahora.toLocalDate().minusDays(1), deAyer);
        String asociar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, ?, ?)";
        var ingreso = java.sql.Timestamp.valueOf(ahora.minusMinutes(1));
        // En curso: 2 habilitados (uno ingresó) y 1 no habilitado.
        jdbc.update(asociar, estudiante("209800001", "Ana"), enCurso, pa, true, ingreso);
        jdbc.update(asociar, estudiante("209800002", "Beto"), enCurso, pa, true, null);
        jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, motivo_inhabilitacion) "
                + "VALUES (?, ?, ?, FALSE, 'Deuda en biblioteca')", estudiante("209800003", "Ciro"), enCurso, pa);
        // Por iniciar: 2 habilitados que aún no ingresan.
        jdbc.update(asociar, estudiante("209800004", "Dora"), porIniciar, pb, true, null);
        jdbc.update(asociar, estudiante("209800005", "Eva"), porIniciar, pb, true, null);
        // Ayer: 2 habilitados, uno faltó.
        jdbc.update(asociar, estudiante("209800006", "Fito"), deAyer, pc, true, java.sql.Timestamp.valueOf(ahora.minusDays(1).withHour(8)));
        jdbc.update(asociar, estudiante("209800007", "Gabi"), deAyer, pc, true, null);
        String intento = "INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, observacion, fecha_hora) VALUES (?, ?, ?, '1', ?, ?)";
        jdbc.update(intento, enCurso, pa, idDocente, "Ambiente incorrecto: se presentó en el aula 691B", ingreso);
        // La excepción de un no habilitado también deja un intento: no se cuenta dos veces.
        jdbc.update(intento, enCurso, pa, idDocente, "Intento ingresar no habilitado ### Ciro", ingreso);
        sincronizar();

        var despues = inicioAdminService.resumen();
        var h0 = antes.hoy();
        var h1 = despues.hoy();
        assertThat(h1.examenes() - h0.examenes()).isEqualTo(2);
        assertThat(h1.enCurso() - h0.enCurso()).isEqualTo(1);
        assertThat(h1.asociados() - h0.asociados()).isEqualTo(5);
        assertThat(h1.ingresados() - h0.ingresados()).isEqualTo(1);
        assertThat(h1.porIngresar() - h0.porIngresar()).isEqualTo(2);
        assertThat(h1.ausentes() - h0.ausentes()).isEqualTo(1);
        assertThat(h1.incidencias() - h0.incidencias()).isEqualTo(1);
        // «Incidencias → Revisar»: el detalle de hoy coincide con el contador y no repite la excepción.
        var detalle = inicioAdminService.incidenciasDeHoy();
        assertThat(detalle).hasSize(h1.incidencias());
        assertThat(detalle).filteredOn(i -> i.idExamen() == enCurso).singleElement().satisfies(i -> {
            assertThat(i.tipo()).isEqualTo("INTENTO_INCORRECTO");
            assertThat(i.detalle()).startsWith("Ambiente incorrecto");
            assertThat(i.examen()).startsWith("Materia TST-INI1");
        });
        assertThat(despues.examenes()).anySatisfy(e -> {
            assertThat(e.idExamen()).isEqualTo(enCurso);
            assertThat(List.of(e.asociados(), e.habilitados(), e.ingresados())).containsExactly(3, 2, 1);
        });
        assertThat(despues.examenes()).noneMatch(e -> e.idExamen() == deAyer);
        int hora = ingreso.toLocalDateTime().getHour();
        assertThat(despues.ingresosPorHora()[hora] - antes.ingresosPorHora()[hora]).isEqualTo(1);
        assertThat(despues.esperadosPorHora()[inicioB.getHour()] - antes.esperadosPorHora()[inicioB.getHour()]).isEqualTo(2);
        assertThat(despues.dias()).hasSize(7);
        assertThat(despues.dias().get(6).fecha()).isEqualTo(ahora.toLocalDate());
        var ayer0 = antes.dias().get(5);
        var ayer1 = despues.dias().get(5);
        assertThat(List.of(ayer1.asociados() - ayer0.asociados(), ayer1.ingresados() - ayer0.ingresados(), ayer1.ausentes() - ayer0.ausentes()))
                .containsExactly(2, 1, 1);
        assertThat(despues.motivos()).anySatisfy(m -> {
            assertThat(m.motivo()).isEqualTo("Aula incorrecta");
            assertThat(m.cantidad()).isPositive();
        });
        assertThat(despues.motivos()).noneMatch(m -> m.motivo().startsWith("Intento ingresar no habilitado"));
        assertThat(despues.pendientes().intentosHoy() - antes.pendientes().intentosHoy()).isEqualTo(1);
    }

    // IMP-12: el docente se registra con sus materias y solo programa exámenes de ellas.
    @Test
    void elDocenteSoloProgramaExamenesDeSusMaterias() {
        prepararCatalogo();
        int suya = materiaYParalelo("TST-DM1");
        int ajena = materiaYParalelo("TST-DM2");
        Integer idSuya = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, suya);
        Integer idAjena = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, ajena);

        assertThatThrownBy(() -> docenteMateriaService.asignar(idDocente, List.of())).hasMessageContaining("al menos una materia");
        assertThat(docenteMateriaService.asignar(idDocente, List.of(idSuya, idSuya))).extracting(m -> m.id()).containsExactly(idSuya);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM docente_materia WHERE id_docente = ?", Integer.class, idDocente)).isEqualTo(1);

        var fecha = asistenciaExamenRepository.obtenerFechaHoraServidor().toLocalDate().plusDays(5);
        java.util.function.Function<Integer, com.nexacore.examenes.dto.CrearExamenRequest> pedido = (idMateria) ->
                new com.nexacore.examenes.dto.CrearExamenRequest("Materia", "Luis Paz", fecha, java.time.LocalTime.of(idMateria.equals(idSuya) ? 10 : 14, 0),
                        90, idAmbiente, List.of(), List.of(), idMateria, idDocente);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("luis.paz@umss.edu", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_DOCENTE"))));
        try {
            assertThatThrownBy(() -> examenService.crear(pedido.apply(idAjena))).hasMessageContaining("Solo puedes programar exámenes de tus materias");
            assertThat(examenService.crear(pedido.apply(idSuya)).idMateria()).isEqualTo(idSuya);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
        // El ADMIN sí puede programar en cualquier materia.
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("admin@umss.edu", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"))));
        try {
            assertThat(examenService.crear(pedido.apply(idAjena)).idMateria()).isEqualTo(idAjena);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void elDocenteSeRegistraConAlMenosUnaMateria() {
        prepararCatalogo();
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, materiaYParalelo("TST-DM3"));
        java.util.function.BiFunction<String, List<Integer>, com.nexacore.examenes.dto.RegisterUserRequest> docente = (ci, materias) ->
                new com.nexacore.examenes.dto.RegisterUserRequest("Rosa", "Vargas", ci, "rosa" + ci + "@umss.edu", "DOCENTE", true, false, materias);

        assertThatThrownBy(() -> usuarioService.registrar(docente.apply("7000001", List.of()))).hasMessageContaining("al menos una materia");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE ci = '7000001'", Integer.class)).isZero();

        int id = usuarioService.registrar(docente.apply("7000002", List.of(idMateria))).id();
        assertThat(docenteMateriaService.materiasDe(id)).extracting(m -> m.id()).containsExactly(idMateria);
        // Sin la lista (importación por archivo) se registra igual; sus materias se asignan después.
        int importado = usuarioService.registrar(docente.apply("7000003", null)).id();
        assertThat(docenteMateriaService.materiasDe(importado)).isEmpty();
    }

    // Con G1 y G2 de la misma materia, el examen va al grupo elegido; sin elegir, se pide el grupo (antes daba 500).
    @Test
    void conVariosGruposElExamenVaAlGrupoElegido() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-GRP");
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, g1);
        Integer g2 = jdbc.queryForObject("INSERT INTO paralelo (id_materia, id_docente, nombre_grupo) VALUES (?, ?, '2') RETURNING id_paralelo",
                Integer.class, idMateria, idDocente);
        int est = estudiante("209900001", "Ivo");
        jdbc.update("INSERT INTO inscripcion_paralelo (id_estudiante, id_paralelo, id_materia, id_docente, estado) VALUES (?, ?, ?, ?, 'inscrito')",
                est, g2, idMateria, idDocente);
        jdbc.update("INSERT INTO docente_materia (id_docente, id_materia) VALUES (?, ?) ON CONFLICT DO NOTHING", idDocente, idMateria);
        sincronizar();

        assertThat(docenteMateriaService.gruposDe(idDocente, idMateria)).extracting(g -> g.nombreGrupo() + ":" + g.inscritos())
                .containsExactly("1:0", "2:1");
        java.util.function.Function<Integer, com.nexacore.examenes.dto.CrearExamenRequest> examen = idParalelo ->
                new com.nexacore.examenes.dto.CrearExamenRequest("Materia TST-GRP", "Luis Paz", java.time.LocalDate.now().plusDays(3),
                        java.time.LocalTime.of(9, 0), 90, idAmbiente, List.of(), List.of(), idMateria, idDocente, null, null, idParalelo);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("admin.grupos@umss.edu", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"))));
        try {
            assertThatThrownBy(() -> examenService.crear(examen.apply(null))).hasMessageContaining("elige el grupo");
            assertThatThrownBy(() -> examenService.crear(examen.apply(999999))).hasMessageContaining("no es de esta materia");
            var creado = examenService.crear(examen.apply(g2));
            assertThat(creado.idParalelo()).isEqualTo(g2);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    // DASH-05: la asistencia se exporta solo si el examen ya empezó (estado calculado con la hora), con los habilitados,
    // la hora en HH:MM:SS, "-" en los ausentes y el nombre del archivo con la materia, el grupo y la fecha.
    @Test
    void laAsistenciaSeExportaSoloSiElExamenEmpezoYConLosHabilitados() throws Exception {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-EXP");
        int manana = examen(paralelo, "08:00", 90);
        assertThatThrownBy(() -> asistenciaExportService.generarCsv(manana)).hasMessageContaining("aún no ha iniciado");

        int ayer = examen(paralelo, "10:00", 90);
        jdbc.update("UPDATE examen SET fecha = CURRENT_DATE - 1 WHERE id_examen = ?", ayer);
        String asociar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, motivo_inhabilitacion, fecha_hora_ingreso) VALUES (?, ?, ?, ?, ?, ?)";
        jdbc.update(asociar, estudiante("209910001", "Ana"), ayer, paralelo, true, null, java.sql.Timestamp.valueOf(java.time.LocalDate.now().minusDays(1).atTime(10, 5, 9)));
        jdbc.update(asociar, estudiante("209910002", "Beto"), ayer, paralelo, true, null, null);
        jdbc.update(asociar, estudiante("209910003", "Ciro"), ayer, paralelo, false, "Deuda en biblioteca", null);
        // Más de 500 habilitados (criterio 2): la exportación termina sin problema.
        for (int i = 0; i < 600; i++) {
            jdbc.update(asociar, estudiante(String.format("2099%05d", 20000 + i), "Masivo"), ayer, paralelo, true, null, null);
        }
        sincronizar();

        String csv = new String(asistenciaExportService.generarCsv(ayer), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csv).startsWith("\uFEFFCódigo SIS;Nombre;Apellidos;Estado;Hora");
        assertThat(csv).contains("209910001;Ana;Prueba;Asistió;10:05:09").contains("209910002;Beto;Prueba;Ausente;-").doesNotContain("Ciro");
        assertThat(csv.lines().count()).isEqualTo(1 + 2 + 600);
        byte[] xlsx = asistenciaExportService.generarExcel(ayer);
        try (var libro = new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(xlsx))) {
            assertThat(libro.getSheetAt(0).getLastRowNum()).isEqualTo(602);
        }
        assertThat(asistenciaExportService.nombreArchivo(ayer, "xlsx"))
                .isEqualTo("asistencia_Materia-TST-EXP_1_" + java.time.LocalDate.now().minusDays(1) + ".xlsx");
    }

    // DASH-02 (sección 11): los últimos ingresos, del más reciente al más antiguo, con el total y la marca del expulsado.
    @Test
    void losIngresosRecientesVanDelMasRecienteAlMasAntiguo() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-REC");
        int examen = examen(g1, "10:00", 90);
        String ingresar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso, id_ambiente_ingreso) VALUES (?, ?, ?, TRUE, ?, ?)";
        int ana = estudiante("202499501", "Ana"), beto = estudiante("202499502", "Beto"), ciro = estudiante("202499503", "Ciro");
        int dora = estudiante("202499504", "Dora");
        jdbc.update(ingresar, ana, examen, g1, java.sql.Timestamp.valueOf("2026-10-20 08:01:00"), idAmbiente);
        jdbc.update(ingresar, beto, examen, g1, java.sql.Timestamp.valueOf("2026-10-20 08:05:30"), idAmbiente);
        jdbc.update(ingresar, ciro, examen, g1, java.sql.Timestamp.valueOf("2026-10-20 08:03:10"), idAmbiente);
        jdbc.update(ingresar, dora, examen, g1, null, null); // habilitada sin ingreso: no aparece
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo, fecha_hora) VALUES (?, ?, ?, 'Uso de celular', ?)",
                beto, examen, idDocente, java.sql.Timestamp.valueOf("2026-10-20 08:20:00"));
        jdbc.update("UPDATE asistencia_examen SET fecha_hora_salida = ? WHERE id_examen = ? AND id_estudiante = ?",
                java.sql.Timestamp.valueOf("2026-10-20 08:40:00"), examen, ciro);
        sincronizar();

        // Una fila por estudiante que ingresó (Dora no), por su actividad más reciente: Ciro salió 08:40, Beto fue
        // expulsado 08:20 y Ana solo ingresó 08:01.
        var r = ingresosRecientesService.recientes(examen, 2);
        assertThat(r.total()).isEqualTo(3);
        assertThat(r.ingresos()).extracting(f -> f.idEstudiante()).containsExactly(ciro, beto);
        assertThat(r.ingresos().get(0)).satisfies(f -> {
            assertThat(f.fechaHoraIngreso().toLocalTime()).hasToString("08:03:10");
            assertThat(f.fechaHoraSalida().toLocalTime()).hasToString("08:40");
            assertThat(f.salidaAlCierre()).isFalse();
            assertThat(f.aula()).isNotBlank();
        });
        assertThat(r.ingresos().get(1)).satisfies(f -> {
            assertThat(f.fechaHoraExpulsion().toLocalTime()).hasToString("08:20");
            assertThat(f.motivoExpulsion()).isEqualTo("Uso de celular");
            assertThat(f.expulsionAnulada()).isFalse();
            assertThat(f.fechaHoraSalida()).isNull(); // el examen (mañana) no terminó
        });
        assertThat(ingresosRecientesService.recientes(examen, 2, 1).ingresos()).extracting(f -> f.idEstudiante()).containsExactly(ana);

        // Con el examen terminado, quien no marcó salida y no fue expulsado salió al cierre (hora de fin).
        jdbc.update("UPDATE examen SET fecha = CURRENT_DATE - 1 WHERE id_examen = ?", examen);
        sincronizar();
        var alCierre = ingresosRecientesService.recientes(examen, 6).ingresos();
        assertThat(alCierre).filteredOn(f -> f.idEstudiante() == ana).singleElement().satisfies(f -> {
            assertThat(f.salidaAlCierre()).isTrue();
            assertThat(f.fechaHoraSalida().toLocalTime()).hasToString("11:30"); // 10:00 + 90 min
        });
        assertThat(alCierre).filteredOn(f -> f.idEstudiante() == beto).singleElement()
                .satisfies(f -> assertThat(f.fechaHoraSalida()).isNull()); // expulsado: no sale al cierre
        assertThat(alCierre).filteredOn(f -> f.idEstudiante() == ciro).singleElement()
                .satisfies(f -> assertThat(f.salidaAlCierre()).isFalse()); // ya había salido
        assertThatThrownBy(() -> ingresosRecientesService.recientes(999999, 6)).hasMessageContaining("No se encontró el examen");
    }

    // V56: la salida se registra una vez, solo para quien ingresó y no fue expulsado; se reinicia al reprogramar.
    @Test
    void laSalidaSoloEsDeQuienIngresoYNoFueExpulsado() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-SAL");
        int examen = examen(g1, "10:00", 90);
        String asociar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, TRUE, ?)";
        var ingreso = java.sql.Timestamp.valueOf("2026-10-20 08:01:00");
        int ana = estudiante("202499601", "Ana"), beto = estudiante("202499602", "Beto"), ciro = estudiante("202499603", "Ciro");
        jdbc.update(asociar, ana, examen, g1, ingreso);
        jdbc.update(asociar, beto, examen, g1, ingreso);
        jdbc.update(asociar, ciro, examen, g1, null);
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo) VALUES (?, ?, ?, 'Uso de celular')", beto, examen, idDocente);
        sincronizar();

        var salida = salidaExamenService.registrar(examen, ana, "luis.paz@umss.edu");
        assertThat(salida.fechaHoraSalida()).isNotNull();
        assertThat(jdbc.queryForObject("SELECT id_usuario_salida FROM asistencia_examen WHERE id_examen = ? AND id_estudiante = ?",
                Integer.class, examen, ana)).isEqualTo(idDocente);
        assertThatThrownBy(() -> salidaExamenService.registrar(examen, ana, "luis.paz@umss.edu")).hasMessageContaining("ya está registrada");
        assertThatThrownBy(() -> salidaExamenService.registrar(examen, beto, "luis.paz@umss.edu")).hasMessageContaining("expulsado");
        assertThatThrownBy(() -> salidaExamenService.registrar(examen, ciro, "luis.paz@umss.edu")).hasMessageContaining("aún no ingresó");
        assertThatThrownBy(() -> salidaExamenService.registrar(examen, 999999, "luis.paz@umss.edu")).hasMessageContaining("no está asociado");

        // El CSV de asistencia (DASH-05) lleva la hora de salida, como el acta PDF.
        jdbc.update("UPDATE examen SET fecha = CURRENT_DATE - 1 WHERE id_examen = ?", examen);
        String csv = new String(asistenciaExportService.generarCsv(examen), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csv).contains("Hora de ingreso;Hora de salida");
        String horaSalida = salida.fechaHoraSalida().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"));
        assertThat(csv.lines().filter(l -> l.startsWith("202499601;"))).singleElement().asString().endsWith(";" + horaSalida);
        assertThat(csv.lines().filter(l -> l.startsWith("202499603;"))).singleElement().asString().endsWith(";-;-");
    }

    // DASH-03 (alerta de aforo): ocupación de cada aula. Con capacidad 3, al tercer ingreso queda llena; el expulsado ya
    // salió y no cuenta; el trasladado cuenta en su aula nueva.
    @Test
    void laOcupacionDeLasAulasAvisaCuandoUnaSeLlena() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-AFO");
        int examen = examen(g1, "10:00", 90);
        jdbc.update("UPDATE ambiente SET capacidad = 3 WHERE id_ambiente = ?", idAmbiente);
        Integer otraAula = jdbc.queryForObject("SELECT MIN(id_ambiente) FROM ambiente WHERE id_ambiente <> ?", Integer.class, idAmbiente);
        String ingresar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso, id_ambiente_ingreso) VALUES (?, ?, ?, TRUE, NOW(), ?)";
        int a1 = estudiante("202499401", "Ana"), a2 = estudiante("202499402", "Beto"), a3 = estudiante("202499403", "Ciro"), a4 = estudiante("202499404", "Dora");
        jdbc.update(ingresar, a1, examen, g1, idAmbiente);
        jdbc.update(ingresar, a2, examen, g1, idAmbiente);
        sincronizar();
        assertThat(aforoService.delAula(examen, idAmbiente)).hasValueSatisfying(o -> {
            assertThat(o.ocupados()).isEqualTo(2);
            assertThat(o.estado()).isEqualTo("LIBRE");
        });

        jdbc.update(ingresar, a3, examen, g1, idAmbiente);
        jdbc.update(ingresar, a4, examen, g1, otraAula); // trasladada: cuenta en su aula nueva
        sincronizar();
        var aulas = aforoService.delExamen(examen);
        assertThat(aulas).extracting(o -> o.idAmbiente()).contains(idAmbiente, otraAula);
        assertThat(aulas.get(0)).satisfies(o -> {
            assertThat(o.idAmbiente()).isEqualTo(idAmbiente);
            assertThat(o.ocupados()).isEqualTo(3);
            assertThat(o.estado()).isEqualTo("LLENA");
        });

        // El expulsado sale del aula: vuelve a haber lugar.
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo) VALUES (?, ?, ?, 'Uso de celular')", a3, examen, idDocente);
        sincronizar();
        assertThat(aforoService.delAula(examen, idAmbiente)).hasValueSatisfying(o -> {
            assertThat(o.ocupados()).isEqualTo(2);
            assertThat(o.estado()).isEqualTo("LIBRE");
        });
    }

    // Los buscadores no distinguen tildes ni mayúsculas: «perez quinones» encuentra a «Pérez Quiñones».
    @Test
    void losBuscadoresNoDistinguenTildes() {
        prepararCatalogo();
        int ana = estudiante("202499301", "Ana");
        jdbc.update("UPDATE estudiante SET apellidos = 'Pérez Quiñones', nombre = 'Ána' WHERE id_estudiante = ?", ana);
        jdbc.update("INSERT INTO usuario (nombre, apellidos, ci, email, password, estado) VALUES ('Ñusta', 'Ríos Álvarez', '88887771', 'nusta.rios@umss.edu', 'x', 'activo')");
        sincronizar();
        for (String busqueda : new String[] {"perez quinones", "PÉREZ", "ana perez", "Quiñones"}) {
            assertThat(estudianteService.listar(0, 10, busqueda, null, null).contenido())
                    .as(busqueda).extracting(e -> e.id()).contains(ana);
        }
        for (String busqueda : new String[] {"nusta", "rios alvarez", "RÍOS"}) {
            assertThat(usuarioService.listar(0, 10, busqueda, null, null).contenido())
                    .as(busqueda).extracting(u -> u.email()).contains("nusta.rios@umss.edu");
        }
    }

    // Evidencia de una expulsión (V55): hasta 3 imágenes reales, solo de una expulsión de ese examen.
    @Test
    void laExpulsionGuardaHastaTresFotosDeEvidencia() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-EVI");
        int ana = estudiante("202499201", "Ana");
        int examen = examen(g1, "10:00", 90);
        jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, TRUE, NOW())", ana, examen, g1);
        Integer idExpulsion = jdbc.queryForObject("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo) VALUES (?, ?, ?, 'Uso de celular') RETURNING id_expulsion",
                Integer.class, ana, examen, idDocente);
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};
        java.util.function.Function<String, org.springframework.mock.web.MockMultipartFile> foto = nombre ->
                new org.springframework.mock.web.MockMultipartFile("files", nombre, "image/png", png);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("luis.paz@umss.edu", null, List.of()));
        try {
            var lista = expulsionEvidenciaService.agregar(examen, idExpulsion, List.of(foto.apply("a.png"), foto.apply("b.png")));
            assertThat(lista).hasSize(2).allSatisfy(e -> {
                assertThat(e.tipo()).isEqualTo("image/png");
                assertThat(e.tamano()).isEqualTo(png.length);
            });
            assertThat(expulsionEvidenciaService.imagen(examen, idExpulsion, lista.get(0).idEvidencia()).getContenido()).isEqualTo(png);
            assertThat(jdbc.queryForObject("SELECT id_usuario FROM expulsion_evidencia WHERE id_evidencia = ?", Integer.class, lista.get(0).idEvidencia()))
                    .isEqualTo(idDocente);
            // Hasta 3 fotos: la tercera entra, la cuarta no.
            expulsionEvidenciaService.agregar(examen, idExpulsion, List.of(foto.apply("c.png")));
            assertThatThrownBy(() -> expulsionEvidenciaService.agregar(examen, idExpulsion, List.of(foto.apply("d.png"))))
                    .hasMessageContaining("hasta 3");
            // Solo imágenes, y solo de una expulsión de ese examen.
            var texto = new org.springframework.mock.web.MockMultipartFile("files", "x.png", "image/png", "no soy imagen".getBytes());
            jdbc.update("DELETE FROM expulsion_evidencia WHERE id_expulsion = ?", idExpulsion);
            assertThatThrownBy(() -> expulsionEvidenciaService.agregar(examen, idExpulsion, List.of(texto))).hasMessageContaining("JPG, PNG o WEBP");
            assertThatThrownBy(() -> expulsionEvidenciaService.listar(examen + 999, idExpulsion)).hasMessageContaining("No se encontró la expulsión");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    // La planilla de estudiantes se descarga con los filtros de la pantalla (materia y grupo) y la del docente
    // solo trae a sus estudiantes; la plantilla para importar trae solo encabezados y un ejemplo.
    @Test
    void laPlanillaSeFiltraPorMateriaYGrupoYLaPlantillaEsSoloUnEjemplo() throws Exception {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-PLA");
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, g1);
        int ana = estudiante("202499101", "Ana");
        estudiante("202499102", "Beto");
        jdbc.update("INSERT INTO inscripcion_paralelo (id_estudiante, id_paralelo, id_materia, id_docente, estado) VALUES (?, ?, ?, ?, 'inscrito')",
                ana, g1, idMateria, idDocente);
        sincronizar();

        var deLaMateria = planillaEstudiantesService.filas(new com.nexacore.examenes.services.PlanillaEstudiantesService.Filtro(
                null, null, null, null, idMateria, g1));
        assertThat(deLaMateria).extracting(f -> f.codigoSis()).containsExactly("202499101");
        // Con filtro de materia la lista dice en qué materia y grupo está cada estudiante.
        assertThat(deLaMateria.get(0).materias()).isEqualTo("Materia TST-PLA · 1");
        String reporte = new String(planillaEstudiantesService.csv(new com.nexacore.examenes.services.PlanillaEstudiantesService.Filtro(
                null, null, null, null, idMateria, g1)), java.nio.charset.StandardCharsets.UTF_8);
        String encabezado = reporte.replace("\uFEFF", "").split("\n")[0];
        assertThat(encabezado).isEqualTo("Código SIS;Nombres;Apellidos;CI;Correo;Teléfono;Facultad;Carrera;Materia · Grupo;Matrícula");
        assertThat(reporte).contains("Materia TST-PLA · 1").contains("Matriculado").doesNotContain("idFacultad");
        var delDocente = planillaEstudiantesService.filas(new com.nexacore.examenes.services.PlanillaEstudiantesService.Filtro(
                "2024991", null, null, idDocente, null, null));
        assertThat(delDocente).extracting(f -> f.codigoSis()).containsExactly("202499101");
        String pdf = new com.lowagie.text.pdf.parser.PdfTextExtractor(new com.lowagie.text.pdf.PdfReader(
                planillaEstudiantesService.pdf(new com.nexacore.examenes.services.PlanillaEstudiantesService.Filtro(
                        null, null, null, null, idMateria, g1)))).getTextFromPage(1);
        assertThat(pdf).contains("Materia TST-PLA").contains("Grupo 1");

        try (var libro = new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(planillaEstudiantesService.plantillaXlsx()))) {
            var hoja = libro.getSheetAt(0);
            assertThat(hoja.getLastRowNum()).isEqualTo(1);
            assertThat(hoja.getRow(0).getCell(0).getStringCellValue()).isEqualTo("codigoSis");
            assertThat(hoja.getRow(1).getCell(0).getStringCellValue()).isEqualTo("202100101");
        }
        String csv = new String(planillaEstudiantesService.plantillaCsv(), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csv.strip().split("\n")).hasSize(2);
    }

    // Sección 22, paso «Revisar»: separa los estudiantes ya registrados y las carreras que no existen, sin guardar.
    @Test
    void laRevisionDeLaImportacionSeparaLosYaRegistradosYLasCarrerasInexistentes() {
        prepararCatalogo();
        int ana = estudiante("202499001", "Ana");
        String ciAna = jdbc.queryForObject("SELECT ci FROM estudiante WHERE id_estudiante = ?", String.class, ana);
        Integer facultad = jdbc.queryForObject("SELECT MIN(id_facultad) FROM facultad", Integer.class);
        Integer carrera = jdbc.queryForObject("SELECT MIN(id_carrera) FROM carrera", Integer.class);
        String csv = "codigoSis,nombre,apellidos,ci,email,idFacultad,idCarrera\n"
                + "202499002,Beto,Rojas Paz," + ciAna + ",202499002@est.umss.edu," + facultad + "," + carrera + "\n"
                + "202499003,Carla,Luna Vera,7712345,202499003@est.umss.edu," + facultad + ",99999\n"
                + "202499004,Dario,Soto Rios,7712346,202499004@est.umss.edu," + facultad + "," + carrera + "\n";
        var archivo = new org.springframework.mock.web.MockMultipartFile("file", "estudiantes.csv", "text/csv",
                csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        Integer antes = jdbc.queryForObject("SELECT COUNT(*) FROM estudiante", Integer.class);

        var revision = importacionEstudiantesService.revisar(archivo);

        assertThat(revision.filas()).isEqualTo(3);
        assertThat(revision.yaRegistradas()).isEqualTo(1);
        assertThat(revision.listas()).isEqualTo(1);
        assertThat(revision.errores()).singleElement().satisfies(e -> {
            assertThat(e.fila()).isEqualTo(3);
            assertThat(e.columna()).isEqualTo("Carrera");
            assertThat(e.mensaje()).contains("99999");
        });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM estudiante", Integer.class)).isEqualTo(antes);
    }

    // Grupos del docente: el ADMIN elige G1, G2… de cada materia; no se repite el grupo de otro docente ni se
    // quita uno con exámenes o estudiantes; sin grupos en la petición no se tocan los que ya tiene.
    @Test
    void elAdminAsignaLosGruposDeCadaMateriaDelDocente() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-GRP");
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, g1);

        // El grupo antiguo «1» pasa a «G1» y se crea el G2.
        docenteMateriaService.asignar(idDocente, List.of(idMateria), java.util.Map.of(idMateria, List.of("g1", "2")));
        assertThat(docenteMateriaService.materiasConGrupos(idDocente)).singleElement()
                .satisfies(m -> assertThat(m.grupos()).containsExactly("G1", "G2"));
        assertThat(docenteMateriaService.gruposDe(idDocente, idMateria)).extracting(g -> g.nombreGrupo()).containsExactly("G1", "G2");

        // Sin grupos en la petición no se tocan.
        docenteMateriaService.asignar(idDocente, List.of(idMateria), null);
        assertThat(docenteMateriaService.materiasConGrupos(idDocente).get(0).grupos()).containsExactly("G1", "G2");

        // Otro docente no puede tener el G2 de la misma materia, pero sí el G3.
        Integer otro = jdbc.queryForObject("INSERT INTO usuario (nombre,apellidos,ci,email,password,estado) VALUES ('Eva','Rios','88888991','eva.grupos@umss.edu','x','activo') RETURNING id_usuario", Integer.class);
        jdbc.update("INSERT INTO docente (id_usuario,categoria) VALUES (?,'INTERINO')", otro);
        assertThatThrownBy(() -> docenteMateriaService.asignar(otro, List.of(idMateria), java.util.Map.of(idMateria, List.of("G2"))))
                .hasMessageContaining("El grupo G2 de Materia TST-GRP ya es de");
        docenteMateriaService.asignar(otro, List.of(idMateria), java.util.Map.of(idMateria, List.of("G3")));
        assertThat(docenteMateriaService.materiasConGrupos(otro).get(0).grupos()).containsExactly("G3");

        // No se quita un grupo con exámenes; uno sin uso, sí.
        examen(g1, "09:00", 60);
        assertThatThrownBy(() -> docenteMateriaService.asignar(idDocente, List.of(idMateria), java.util.Map.of(idMateria, List.of("G2"))))
                .hasMessageContaining("No se puede quitar el grupo G1");
        docenteMateriaService.asignar(idDocente, List.of(idMateria), java.util.Map.of(idMateria, List.of("G1")));
        assertThat(docenteMateriaService.materiasConGrupos(idDocente).get(0).grupos()).containsExactly("G1");

        // Formato y materias: G1… G20, al menos uno, y solo de las materias elegidas.
        assertThatThrownBy(() -> docenteMateriaService.asignar(idDocente, List.of(idMateria), java.util.Map.of(idMateria, List.of("A"))))
                .hasMessageContaining("no es válido");
        assertThatThrownBy(() -> docenteMateriaService.asignar(idDocente, List.of(idMateria), java.util.Map.of(idMateria, List.of())))
                .hasMessageContaining("al menos un grupo");
        assertThatThrownBy(() -> docenteMateriaService.asignar(idDocente, List.of(idMateria), java.util.Map.of(idMateria + 999, List.of("G1"))))
                .hasMessageContaining("de las materias elegidas");
    }

    // Panel del docente (secciones 15 y 18): sus materias con grupos y estudiantes, próximo examen, asistencia, totales,
    // ingresos y expulsiones de hoy y sus últimos registros.
    @Test
    void elPanelDelDocenteMuestraSusMateriasYRegistros() {
        prepararCatalogo();
        int g1 = materiaYParalelo("TST-PAN");
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, g1);
        jdbc.update("INSERT INTO paralelo (id_materia, id_docente, nombre_grupo) VALUES (?, ?, '2')", idMateria, idDocente);
        jdbc.update("INSERT INTO docente_materia (id_docente, id_materia) VALUES (?, ?) ON CONFLICT DO NOTHING", idDocente, idMateria);
        int ana = estudiante("209940001", "Ana");
        int beto = estudiante("209940002", "Beto");
        String inscribir = "INSERT INTO inscripcion_paralelo (id_estudiante, id_paralelo, id_materia, id_docente, estado) VALUES (?, ?, ?, ?, 'inscrito')";
        jdbc.update(inscribir, ana, g1, idMateria, idDocente);
        jdbc.update(inscribir, beto, g1, idMateria, idDocente);
        int examen = examen(g1, "10:00", 90);
        jdbc.update("UPDATE examen SET fecha = CURRENT_DATE - 1 WHERE id_examen = ?", examen);
        var ahora = asistenciaExamenRepository.obtenerFechaHoraServidor();
        String asociar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, TRUE, ?)";
        jdbc.update(asociar, ana, examen, g1, java.sql.Timestamp.valueOf(ahora.minusMinutes(20)));
        jdbc.update(asociar, beto, examen, g1, null);
        jdbc.update("INSERT INTO registro_control_ingreso (id_examen, id_paralelo, id_estudiante, id_usuario_control, resultado_autorizacion, fecha_hora, tipo_ingreso) "
                + "VALUES (?, ?, ?, ?, 'AUTORIZADO', ?, 'NORMAL')", examen, g1, ana, idDocente, java.sql.Timestamp.valueOf(ahora.minusMinutes(20)));
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo, fecha_hora) VALUES (?, ?, ?, 'Uso de celular durante el examen', ?)",
                ana, examen, idDocente, java.sql.Timestamp.valueOf(ahora.minusMinutes(5)));
        int manana = examen(g1, "09:00", 60);
        sincronizar();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("luis.paz@umss.edu", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_DOCENTE"))));
        try {
            var panel = inicioDocenteService.resumen();
            assertThat(panel.materias()).singleElement().satisfies(m -> {
                assertThat(m.sigla()).isEqualTo("TST-PAN");
                assertThat(m.grupos()).containsExactly("1", "2");
                assertThat(m.estudiantes()).isEqualTo(2);
                assertThat(m.asistencia()).isEqualTo(50);
                assertThat(m.proximoExamen().idExamen()).isEqualTo(manana);
            });
            assertThat(panel.grupos()).isEqualTo(2);
            assertThat(panel.estudiantes()).isEqualTo(2);
            assertThat(panel.expulsionesHoy()).isEqualTo(1);
            assertThat(java.util.Arrays.stream(panel.ingresosPorHora()).sum()).isEqualTo(1);
            assertThat(panel.recientes()).extracting(r -> r.tipo()).containsExactly("EXPULSION", "INGRESO");
            assertThat(panel.recientes().get(0).detalle()).isEqualTo("Uso de celular durante el examen");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    // Título, especialidad y categoría del docente: los registra y los cambia solo el ADMIN.
    @Test
    void elDocenteSeRegistraConSuTituloEspecialidadYCategoria() {
        prepararCatalogo();
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, materiaYParalelo("TST-DD1"));
        var datos = new com.nexacore.examenes.dto.DatosDocenteRequest("Lic.", "Bases de datos", "TITULAR");
        int id = usuarioService.registrar(new com.nexacore.examenes.dto.RegisterUserRequest("Rosa", "Vargas", "7000010",
                "rosa7000010@umss.edu", "DOCENTE", true, false, List.of(idMateria), datos)).id();
        assertThat(usuarioService.datosDocente(id)).isEqualTo(datos);

        // Al editar: se cambia la especialidad; un texto vacío deja el dato sin registrar.
        usuarioService.actualizar(id, new com.nexacore.examenes.dto.RegisterUserRequest("Rosa", "Vargas", "7000010",
                "rosa7000010@umss.edu", "DOCENTE", true, false, null, new com.nexacore.examenes.dto.DatosDocenteRequest(" ", "Redes", "INVITADO")));
        assertThat(usuarioService.datosDocente(id)).isEqualTo(new com.nexacore.examenes.dto.DatosDocenteRequest(null, "Redes", "INVITADO"));
        // Sin el bloque (por ejemplo, la importación), no se tocan.
        usuarioService.actualizar(id, new com.nexacore.examenes.dto.RegisterUserRequest("Rosa", "Vargas", "7000010",
                "rosa7000010@umss.edu", "DOCENTE", true, false, null));
        assertThat(usuarioService.datosDocente(id).especialidad()).isEqualTo("Redes");
    }

    // IMP-10: el estado del respaldo lee la versión real, el tamaño y las descargas de la auditoría.
    @Test
    void elEstadoDelRespaldoMuestraLaBaseYLasDescargas() {
        prepararCatalogo();
        jdbc.update("INSERT INTO auditoria_operacion (id_usuario, accion, detalles, fecha_hora) VALUES (?, 'RESPALDO_DESCARGADO', ?, ?)",
                idDocente, "{\"archivo\":\"sigex-respaldo-20991231-2359.sql\",\"bytes\":4200000}", java.sql.Timestamp.valueOf("2099-12-31 23:59:00"));
        var estado = respaldoEstadoService.estado();
        assertThat(estado.baseDatos()).startsWith("PostgreSQL 15");
        assertThat(estado.tamanoBytes()).isPositive();
        assertThat(estado.historial()).first().satisfies(r -> {
            assertThat(r.archivo()).isEqualTo("sigex-respaldo-20991231-2359.sql");
            assertThat(r.bytes()).isEqualTo(4200000L);
            assertThat(r.usuario()).isEqualTo("Luis Paz");
        });
    }

    // DASH-01: el expulsado sigue contando como ingresado (con su marca) y el trasladado cuenta una sola vez.
    @Test
    void elResumenDelExamenCuentaExpulsadosYTrasladadosSinVolverlosAusentes() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-DASH01");
        int examen = examen(paralelo, "08:00", 120);
        String asociar = "INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, TRUE, ?)";
        var ingreso = java.sql.Timestamp.valueOf(java.time.LocalDateTime.now().minusMinutes(5));
        int expulsado = estudiante("209700001", "Ana");
        int trasladado = estudiante("209700002", "Beto");
        jdbc.update(asociar, expulsado, examen, paralelo, ingreso);
        jdbc.update(asociar, trasladado, examen, paralelo, ingreso);
        jdbc.update(asociar, estudiante("209700003", "Ciro"), examen, paralelo, null);
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo, fecha_hora) VALUES (?, ?, ?, 'Uso de celular durante el examen', ?)",
                expulsado, examen, idDocente, ingreso);
        jdbc.update("INSERT INTO traslado_ambiente (id_examen, id_estudiante, id_ambiente_origen, id_ambiente_destino, id_usuario_admin, fecha_hora_traslado, motivo) "
                + "VALUES (?, ?, ?, ?, ?, ?, 'El aula se llenó durante el ingreso')", examen, trasladado, idAmbiente,
                jdbc.queryForObject("SELECT min(id_ambiente) FROM ambiente WHERE id_ambiente <> ?", Integer.class, idAmbiente), idDocente, ingreso);
        sincronizar();

        var resumen = identificacionService.resumir(examen);
        assertThat(resumen.habilitados()).isEqualTo(3);
        assertThat(resumen.ingresados()).isEqualTo(2);
        assertThat(resumen.ausentes()).isEqualTo(1);
        assertThat(resumen.expulsados()).isEqualTo(1);
        assertThat(resumen.trasladados()).isEqualTo(1);
    }

    // Inicio de CONTROL: solo cuenta lo que registró quien inició sesión, no lo de otros controles.
    @Test
    void elInicioDelControlMuestraSoloSusRegistrosDeHoy() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-CTRL");
        int examen = examen(paralelo, "08:00", 120);
        Integer otro = jdbc.queryForObject("INSERT INTO usuario (nombre, apellidos, ci, email, password, estado) "
                + "VALUES ('Otro', 'Control', '6666666', 'otro.control@umss.edu', 'x', 'activo') RETURNING id_usuario", Integer.class);
        var ahora = asistenciaExamenRepository.obtenerFechaHoraServidor();
        var hace = java.sql.Timestamp.valueOf(ahora.minusMinutes(3));
        var antes = java.sql.Timestamp.valueOf(ahora.minusMinutes(10));
        int ana = estudiante("209600001", "Ana");
        int beto = estudiante("209600002", "Beto");
        int ciro = estudiante("209600003", "Ciro");
        for (int e : new int[]{ana, beto, ciro}) {
            jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, TRUE, ?)",
                    e, examen, paralelo, hace);
        }
        String ingreso = "INSERT INTO registro_control_ingreso (id_examen, id_paralelo, id_estudiante, id_usuario_control, "
                + "resultado_autorizacion, fecha_hora, tipo_ingreso, justificacion_manual) VALUES (?, ?, ?, ?, 'AUTORIZADO', ?, ?, ?)";
        jdbc.update(ingreso, examen, paralelo, ana, idDocente, antes, "NORMAL", null);
        jdbc.update(ingreso, examen, paralelo, beto, idDocente, hace, "MANUAL", "Su QR no se lee; presentó su carnet");
        jdbc.update(ingreso, examen, paralelo, ciro, otro, hace, "NORMAL", null);
        String intento = "INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, observacion, fecha_hora) VALUES (?, ?, ?, ?, ?, ?)";
        jdbc.update(intento, examen, paralelo, idDocente, "9999999", "No está inscrito en la materia", java.sql.Timestamp.valueOf(ahora.minusMinutes(1)));
        jdbc.update(intento, examen, paralelo, idDocente, "209600003", "Intento ingresar no habilitado ### Ciro", hace);
        jdbc.update("INSERT INTO expulsion (id_estudiante, id_examen, id_usuario_responsable, motivo, fecha_hora) VALUES (?, ?, ?, 'Uso de celular durante el examen', ?)",
                ana, examen, otro, hace);
        sincronizar();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("luis.paz@umss.edu", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CONTROL"))));
        try {
            var mios = inicioControlService.misRegistros();
            assertThat(mios.ingresos()).isEqualTo(2);
            assertThat(mios.ingresosManuales()).isEqualTo(1);
            assertThat(mios.intentosIncorrectos()).isEqualTo(1);
            assertThat(mios.expulsiones()).isZero();
            assertThat(java.util.Arrays.stream(mios.ingresosPorHora()).sum()).isEqualTo(2);
            assertThat(java.util.Arrays.stream(mios.intentosPorHora()).sum()).isEqualTo(1);
            assertThat(mios.qrPorHora()).hasSize(24);
            assertThat(mios.recientes()).extracting(r -> r.tipo()).containsExactly("INTENTO", "INGRESO_MANUAL", "INGRESO");
            assertThat(mios.recientes().get(0).codigo()).isEqualTo("9999999");
            assertThat(mios.recientes().get(1)).satisfies(r -> {
                assertThat(r.estudiante()).isEqualTo("Beto Prueba");
                assertThat(r.codigo()).isEqualTo("209600002");
                assertThat(r.examen()).isEqualTo("Materia TST-CTRL");
            });
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    // V53: el personal de control asignado define "sus" exámenes (reportes y notificaciones); un control no
    // asignado puede registrar como reemplazo y queda marcado.
    @Test
    void elPersonalDeControlAsignadoDefineSusExamenesYElReemplazoQuedaMarcado() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-V53");
        int asignado = examen(paralelo, "08:00", 120);
        int ajeno = examen(paralelo, "14:00", 120);
        String usuario = "INSERT INTO usuario (nombre, apellidos, ci, email, password, estado) VALUES (?, ?, ?, ?, 'x', 'activo') RETURNING id_usuario";
        Integer ctrl = jdbc.queryForObject(usuario, Integer.class, "Carla", "Control", "7000001", "carla.control@umss.edu");
        Integer reemplazo = jdbc.queryForObject(usuario, Integer.class, "Rene", "Reemplazo", "7000002", "rene.reemplazo@umss.edu");
        Integer sinRol = jdbc.queryForObject(usuario, Integer.class, "Sin", "Rol", "7000003", "sin.rol@umss.edu");
        Integer rolControl = jdbc.queryForObject("SELECT id_rol FROM rol WHERE nombre = 'CONTROL'", Integer.class);
        jdbc.update("INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?), (?, ?)", ctrl, rolControl, reemplazo, rolControl);

        assertThat(examenControlService.disponibles()).extracting(p -> p.idUsuario()).contains(ctrl, reemplazo).doesNotContain(sinRol);
        assertThatThrownBy(() -> examenControlService.asignar(asignado, List.of(sinRol)))
                .hasMessageContaining("Solo se puede asignar personal de control");
        assertThat(examenControlService.asignar(asignado, List.of(ctrl))).extracting(p -> p.nombre()).containsExactly("Carla");

        String intento = "INSERT INTO intento_ingreso (id_examen, id_paralelo, id_usuario_control, ci_o_codigo, observacion) VALUES (?, ?, ?, ?, 'No está inscrito')";
        jdbc.update(intento, asignado, paralelo, ctrl, "1111111");
        jdbc.update(intento, ajeno, paralelo, reemplazo, "2222222");
        jdbc.update("INSERT INTO notificacion (tipo, titulo, detalle, id_examen) VALUES ('INTENTO_INGRESO', 'Intento', 'd', ?), ('INTENTO_INGRESO', 'Intento', 'd', ?)",
                asignado, ajeno);
        // La foto reportada la ven el ADMIN, el docente del examen y su personal de control asignado.
        jdbc.update("INSERT INTO notificacion (tipo, titulo, detalle, id_examen) VALUES ('FOTO_REPORTADA', 'Foto', 'd', ?)", asignado);
        int est = estudiante("209800001", "Dora");
        jdbc.update("INSERT INTO asistencia_examen (id_estudiante, id_examen, id_paralelo, habilitado, fecha_hora_ingreso) VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)",
                est, asignado, paralelo);
        jdbc.update("INSERT INTO registro_control_ingreso (id_examen, id_paralelo, id_estudiante, id_usuario_control, resultado_autorizacion, tipo_ingreso) "
                + "VALUES (?, ?, ?, ?, 'AUTORIZADO', 'NORMAL')", asignado, paralelo, est, reemplazo);
        sincronizar();

        // Reportes: solo los intentos de sus exámenes.
        assertThat(intentoIngresoService.reporte(null, 0, 20, ctrl).contenido()).extracting(f -> f.idExamen()).containsOnly(asignado);
        assertThat(intentoIngresoService.reporte(null, 0, 20, null).contenido()).extracting(f -> f.idExamen()).contains(asignado, ajeno);
        // Notificaciones: solo las de sus exámenes asignados.
        assertThat(notificacionRepository.deDocente(ctrl, 0, org.springframework.data.domain.PageRequest.of(0, 50)))
                .extracting(n -> n.getIdExamen()).containsOnly(asignado);
        assertThat(notificacionRepository.deDocente(ctrl, 0, org.springframework.data.domain.PageRequest.of(0, 50)))
                .extracting(n -> n.getTipo()).contains("FOTO_REPORTADA");
        assertThat(notificacionRepository.deDocente(idDocente, 0, org.springframework.data.domain.PageRequest.of(0, 50)))
                .extracting(n -> n.getTipo()).contains("FOTO_REPORTADA");
        // El ingreso que registró un control no asignado queda marcado como reemplazo.
        assertThat(controlIngresoService.consultarRegistrosExamen(asignado)).singleElement().satisfies(r -> assertThat(r.reemplazo()).isTrue());

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("carla.control@umss.edu", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CONTROL"))));
        // Foto reportada en su examen: el control asignado la revisa; el reemplazo (no asignado), no.
        int fotoAsignado = estudiante("209800002", "Eli");
        int fotoAjeno = estudiante("209800003", "Fito");
        String reportar = "INSERT INTO reporte_foto (id_estudiante, id_usuario, id_examen, motivo) VALUES (?, ?, ?, 'NO_SE_PARECE')";
        jdbc.update(reportar, fotoAsignado, reemplazo, asignado);
        jdbc.update(reportar, fotoAjeno, ctrl, ajeno);
        sincronizar();
        assertThat(reporteFotosService.listar(null, ctrl)).extracting(f -> f.idEstudiante()).containsExactly(fotoAsignado);
        assertThat(reporteFotosService.listar(null, null)).extracting(f -> f.idEstudiante()).contains(fotoAsignado, fotoAjeno);
        assertThat(reporteFotosService.listar(asignado, null)).singleElement().satisfies(f -> {
            assertThat(f.estado()).isEqualTo("PENDIENTE");
            assertThat(f.reportadoPor()).isEqualTo("Rene Reemplazo");
            assertThat(f.examen()).isEqualTo("Materia TST-V53");
        });
        var sesionCtrl = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("carla.control@umss.edu", null,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CONTROL")));
        var sesionReemplazo = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("rene.reemplazo@umss.edu", null,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CONTROL")));
        assertThat(fotoRevisionAcceso.puedeRevisar(fotoAsignado, sesionCtrl)).isTrue();
        assertThat(fotoRevisionAcceso.puedeRevisar(fotoAjeno, sesionCtrl)).isFalse();
        assertThat(fotoRevisionAcceso.puedeRevisar(fotoAsignado, sesionReemplazo)).isFalse();
        // Su pantalla de Revisión de fotos: solo las reportadas en sus exámenes.
        assertThat(estudianteFotoService.listarReportesDeExamenes(id -> id == asignado)).extracting(f -> f.idEstudiante()).containsExactly(fotoAsignado);
        assertThat(estudianteFotoService.listarReportesDeExamenes(id -> false)).isEmpty();
        // La revisión del docente y el control trae la misma solicitud que ve el ADMIN.
        assertThat(estudianteFotoService.revisionDelReporte(fotoAsignado, true)).hasValueSatisfying(r -> {
            assertThat(r.idExamen()).isEqualTo(asignado);
            assertThat(r.solicitud().origen()).isEqualTo("REPORTE");
            assertThat(r.solicitud().estado()).isEqualTo("ESPERANDO_FOTO");
            assertThat(r.solicitud().reporte().reportadoPor()).isEqualTo("Rene Reemplazo");
        });
        estudianteFotoService.descartarReporte(fotoAsignado);
        sincronizar();
        assertThat(reporteFotosService.listar(asignado, null)).singleElement().satisfies(f -> {
            assertThat(f.estado()).isEqualTo("DESCARTADO");
            assertThat(f.resueltoEn()).isNotNull();
        });
        assertThat(fotoRevisionAcceso.puedeRevisar(fotoAsignado, sesionCtrl)).isFalse();

        try {
            assertThat(examenService.listarMios()).extracting(e -> e.idExamen()).containsOnly(asignado);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    // Mi perfil: el docente ve sus datos y sus materias con sus grupos; el control, sus exámenes asignados.
    @Test
    void elPerfilMuestraLoPropioDeCadaRol() {
        prepararCatalogo();
        int paralelo = materiaYParalelo("TST-PERF");
        int examen = examen(paralelo, "09:00", 90);
        Integer idMateria = jdbc.queryForObject("SELECT id_materia FROM paralelo WHERE id_paralelo = ?", Integer.class, paralelo);
        jdbc.update("UPDATE docente SET titulo = 'Lic.', especialidad = 'Bases de datos' WHERE id_usuario = ?", idDocente);
        jdbc.update("INSERT INTO docente_materia (id_docente, id_materia) VALUES (?, ?) ON CONFLICT DO NOTHING", idDocente, idMateria);
        Integer ctrl = jdbc.queryForObject("INSERT INTO usuario (nombre, apellidos, ci, email, password, estado) "
                + "VALUES ('Pia', 'Control', '7100001', 'pia.control@umss.edu', 'x', 'activo') RETURNING id_usuario", Integer.class);
        jdbc.update("INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE nombre = 'CONTROL'", ctrl);
        jdbc.update("INSERT INTO examen_control (id_examen, id_usuario) VALUES (?, ?)", examen, ctrl);
        sincronizar();

        var docente = perfilRolService.deLaSesion(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "luis.paz@umss.edu", null, List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_DOCENTE"))));
        assertThat(docente.docente()).isNotNull();
        assertThat(docente.docente().titulo()).isEqualTo("Lic.");
        assertThat(docente.docente().categoria()).isEqualTo("INTERINO");
        assertThat(docente.docente().materias()).anySatisfy(m -> {
            assertThat(m.sigla()).isEqualTo("TST-PERF");
            assertThat(m.grupos()).containsExactly("1");
        });
        assertThat(docente.examenesAsignados()).isNull();
        assertThat(docente.fotoUrl()).isNull();
        // Foto de perfil opcional (V54): se sube, se ve en el perfil y se quita.
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1};
        usuarioFotoService.guardar(idDocente, new org.springframework.mock.web.MockMultipartFile("file", "yo.jpg", "image/jpeg", jpeg));
        assertThat(usuarioFotoService.obtener(idDocente)).hasValueSatisfying(f -> assertThat(f.tipoContenido()).isEqualTo("image/jpeg"));
        assertThat(perfilRolService.deLaSesion(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "luis.paz@umss.edu", null, List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_DOCENTE")))).fotoUrl())
                .isEqualTo("/auth/me/foto");
        assertThatThrownBy(() -> usuarioFotoService.guardar(idDocente,
                new org.springframework.mock.web.MockMultipartFile("file", "x.txt", "image/jpeg", "no es imagen".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);
        usuarioFotoService.quitar(idDocente);
        assertThat(usuarioFotoService.tiene(idDocente)).isFalse();
        assertThat(docente.permisos()).extracting(x -> x.codigo()).contains("EXAMENES_GESTIONAR_PROPIOS").doesNotContain("USUARIOS_GESTIONAR");

        var control = perfilRolService.deLaSesion(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "pia.control@umss.edu", null, List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CONTROL"))));
        assertThat(control.docente()).isNull();
        assertThat(control.examenesAsignados()).singleElement().satisfies(x -> {
            assertThat(x.idExamen()).isEqualTo(examen);
            assertThat(x.materia()).isEqualTo("Materia TST-PERF");
        });
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
