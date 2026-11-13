package com.nexacore.examenes.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexacore.examenes.dto.HistorialOperacionResponse.Dato;
import com.nexacore.examenes.dto.HistorialOperacionResponse.Diferencia;
import com.nexacore.examenes.security.Permiso;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Traduce un registro de auditoría (acción + JSON de detalles) a lo que lee el ADMIN: a qué afectó, un
 * resumen en español, el motivo y los cambios campo por campo con nombres (no ids ni JSON).
 * Una instancia por consulta: guarda en memoria los nombres ya buscados.
 */
class HistorialPresentacion {

    /** Módulo y operación de cada acción conocida. El mismo catálogo arma el filtro en SQL. */
    record Tipo(String modulo, String moduloCodigo, String operacion, String operacionCodigo) {}

    static final Map<String, Tipo> ACCIONES = new LinkedHashMap<>();
    static {
        tipo("USUARIO_CREADO", "Usuarios", "Crear");
        tipo("USUARIO_EDITADO", "Usuarios", "Editar");
        tipo("USUARIO_BLOQUEADO", "Usuarios", "Desactivar");
        tipo("USUARIO_DESBLOQUEADO", "Usuarios", "Activar");
        tipo("ROL_CREADO", "Roles", "Crear");
        tipo("ROL_EDITADO", "Roles", "Editar");
        tipo("ROL_ELIMINADO", "Roles", "Eliminar");
        tipo("EXAMEN_CREADO", "Exámenes", "Crear");
        tipo("EXAMEN_MODIFICADO", "Exámenes", "Editar");
        tipo("EXAMEN_REPROGRAMADO", "Exámenes", "Reprogramar");
        tipo("EXAMEN_CANCELADO", "Exámenes", "Cancelar");
        tipo("HABILITACION_ACTUALIZADA", "Exámenes", "Habilitación");
        tipo("ESTUDIANTE_QUITADO_DEL_EXAMEN", "Exámenes", "Quitar");
        tipo("PERSONAL_CONTROL_ASIGNADO", "Exámenes", "Asignar");
        tipo("ESTUDIANTES_ASOCIADOS", "Exámenes", "Asociar");
        tipo("CUENTA_ESTUDIANTE_ACTIVADA", "Estudiantes", "Activar");
        tipo("ESTUDIANTE_CREADO", "Estudiantes", "Crear");
        tipo("ESTUDIANTE_EDITADO", "Estudiantes", "Editar");
        tipo("ESTUDIANTES_IMPORTADOS", "Estudiantes", "Importar");
        tipo("ESTUDIANTE_FOTO_CAMBIADA", "Estudiantes", "Editar");
        tipo("ESTUDIANTE_FOTO_QUITADA", "Estudiantes", "Eliminar");
        tipo("QR_REGENERADO", "Estudiantes", "Editar");
        tipo("FOTO_APROBADA", "Estudiantes", "Aprobar");
        tipo("FOTO_RECHAZADA", "Estudiantes", "Rechazar");
        tipo("FOTO_REPORTADA", "Estudiantes", "Incidencia");
        tipo("FOTO_REPORTE_DESCARTADO", "Estudiantes", "Descartar");
        tipo("INGRESO_AUTORIZADO", "Control", "Autorizar");
        tipo("INGRESO_DENEGADO", "Control", "Denegar");
        tipo("SALIDA_REGISTRADA", "Control", "Salida");
        tipo("EXPULSION_REGISTRADA", "Control", "Expulsar");
        tipo("EXPULSION_ANULADA", "Control", "Anular");
        tipo("EVIDENCIA_AGREGADA", "Control", "Evidencia");
        tipo("ESTUDIANTE_TRASLADADO", "Control", "Trasladar");
        tipo("EXCEPCION_REGISTRADA", "Control", "Excepción");
        tipo("INTENTO_INGRESO_REGISTRADO", "Control", "Incidencia");
        tipo("AULA_INCORRECTA_REGISTRADA", "Control", "Incidencia");
        tipo("QR_DUPLICADO_REPORTADO", "Control", "Incidencia");
        tipo("USUARIOS_IMPORTADOS", "Usuarios", "Importar");
        tipo("MATERIAS_ASIGNADAS", "Usuarios", "Asignar");
        tipo("CONTRASENA_CAMBIADA", "Usuarios", "Editar");
        tipo("MI_FOTO_CAMBIADA", "Usuarios", "Editar");
        tipo("MI_FOTO_QUITADA", "Usuarios", "Eliminar");
        tipo("AMBIENTE_CREADO", "Ambientes", "Crear");
        tipo("AMBIENTE_AFORO_CAMBIADO", "Ambientes", "Editar");
        tipo("AYUDA_ATENDIDA", "Mesa de ayuda", "Atender");
        tipo("RESPALDO_DESCARGADO", "Configuración", "Respaldo");
    }

    private static void tipo(String accion, String modulo, String operacion) {
        ACCIONES.put(accion, new Tipo(modulo, codigo(modulo), operacion, codigo(operacion)));
    }

    static final Tipo OTRA = new Tipo("Otros", "OTROS", "Otra", "OTRA");

    static Tipo tipoDe(String accion) {
        return ACCIONES.getOrDefault(accion, OTRA);
    }

    /** Sin tildes y en mayúsculas: lo que manda el filtro («Exámenes» → EXAMENES). */
    static String codigo(String texto) {
        return java.text.Normalizer.normalize(texto, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT);
    }

    /** CASE de SQL que da el código de módulo u operación de a.accion, desde el mismo catálogo. */
    static String casoSql(boolean modulo) {
        StringBuilder sql = new StringBuilder("(CASE a.accion");
        ACCIONES.forEach((accion, t) -> sql.append(" WHEN '").append(accion).append("' THEN '")
                .append(modulo ? t.moduloCodigo() : t.operacionCodigo()).append("'"));
        return sql.append(" ELSE '").append(modulo ? OTRA.moduloCodigo() : OTRA.operacionCodigo()).append("' END)").toString();
    }

    /** Lo que se muestra de una operación. */
    record Vista(String objetivo, String resumen, String motivo, List<Diferencia> diferencias, List<Dato> examen) {
        Vista(String objetivo, String resumen, String motivo, List<Diferencia> diferencias) {
            this(objetivo, resumen, motivo, diferencias, List.of());
        }
    }

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Map<String, String> CAMPOS_EXAMEN = new LinkedHashMap<>();
    static {
        CAMPOS_EXAMEN.put("fecha", "Fecha");
        CAMPOS_EXAMEN.put("horaInicio", "Hora");
        CAMPOS_EXAMEN.put("duracionMinutos", "Duración");
        CAMPOS_EXAMEN.put("idAmbiente", "Aula");
        CAMPOS_EXAMEN.put("idDocente", "Docente");
        CAMPOS_EXAMEN.put("idMateria", "Materia");
        CAMPOS_EXAMEN.put("estado", "Estado");
        CAMPOS_EXAMEN.put("modoReparto", "Reparto de aulas");
        CAMPOS_EXAMEN.put("normas", "Normas");
    }
    private static final Map<String, String> HABILITACION = Map.of(
            "HABILITADO", "Habilitado", "NO_HABILITADO", "No habilitado", "PENDIENTE", "Pendiente");

    private final JdbcTemplate jdbc;
    private final Map<String, String> nombres = new HashMap<>();

    HistorialPresentacion(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** La vista con el contexto del examen (si la operación es de uno): cuándo empieza y termina, aula y docente. */
    Vista vista(String accion, JsonNode d) {
        Vista v = vistaBase(accion, d);
        int idExamen = d.path("idExamen").asInt();
        return idExamen == 0 ? v : new Vista(v.objetivo(), v.resumen(), v.motivo(), v.diferencias(), contextoExamen(d));
    }

    private Vista vistaBase(String accion, JsonNode d) {
        return switch (accion) {
            case "EXAMEN_CREADO" -> {
                List<Diferencia> datos = diferenciasExamen(null, d.path("examen"));
                yield new Vista(examen(d), "Programó el examen" + cuando(d.path("examen")), null, datos);
            }
            case "EXAMEN_MODIFICADO" -> {
                List<Diferencia> cambios = diferenciasExamen(d.path("antes"), d.path("despues"));
                yield new Vista(examen(d), cambios.isEmpty() ? "Guardó el examen sin cambios"
                        : "Cambió " + campos(cambios), null, cambios);
            }
            case "EXAMEN_REPROGRAMADO" -> new Vista(examen(d),
                    "Reprogramó el examen" + cuando(d.path("despues")), texto(d, "motivo"),
                    diferenciasExamen(d.path("antes"), d.path("despues")));
            case "EXAMEN_CANCELADO" -> new Vista(examen(d), "Canceló el examen", null,
                    List.of(new Diferencia("Estado", capital(texto(d, "estadoAnterior")), "Cancelado")));
            case "HABILITACION_ACTUALIZADA" -> habilitacion(d);
            case "ESTUDIANTE_QUITADO_DEL_EXAMEN" -> new Vista(examen(d),
                    "Quitó a " + estudiante(d.path("idEstudiante").asInt()) + " del examen", null,
                    List.of(new Diferencia(estudiante(d.path("idEstudiante").asInt()),
                            HABILITACION.getOrDefault(texto(d, "estadoAnterior"), "Asociado"), "Quitado")));
            case "USUARIO_CREADO" -> new Vista(texto(d, "nombre"), "Creó la cuenta con rol " + texto(d, "rol"), null,
                    datos(d, "email", "Correo", "rol", "Rol", "estado", "Estado"));
            case "USUARIO_EDITADO" -> new Vista(texto(d, "nombre"), "Editó los datos de la cuenta", null,
                    datos(d, "email", "Correo", "rol", "Rol", "estado", "Estado"));
            case "USUARIO_BLOQUEADO" -> new Vista(texto(d, "nombre"), "Desactivó la cuenta: ya no puede ingresar", null,
                    List.of(new Diferencia("Estado", "Activo", "Inactivo")));
            case "USUARIO_DESBLOQUEADO" -> new Vista(texto(d, "nombre"), "Reactivó la cuenta", null,
                    List.of(new Diferencia("Estado", "Inactivo", "Activo")));
            case "ROL_CREADO" -> new Vista("Rol " + texto(d, "nombre"),
                    "Creó el rol con " + plural(d.path("permisos").size(), "permiso", "permisos"), null,
                    permisos(null, d.path("permisos")));
            case "ROL_EDITADO" -> rolEditado(d);
            case "ROL_ELIMINADO" -> new Vista("Rol " + texto(d, "nombre"), "Eliminó el rol", null, List.of());
            case "RESPALDO_DESCARGADO" -> new Vista(texto(d, "archivo"),
                    "Descargó el respaldo de la base de datos" + (d.has("bytes") ? " (" + tamano(d.path("bytes").asLong()) + ")" : ""),
                    null, List.of());
            case "PERSONAL_CONTROL_ASIGNADO" -> new Vista(examen(d),
                    d.path("personal").isEmpty() ? "Quitó al personal de control del examen"
                            : "Asignó el personal de control: " + lista(d.path("personal")), null, List.of());
            case "ESTUDIANTES_ASOCIADOS" -> asociados(d);
            case "CUENTA_ESTUDIANTE_ACTIVADA" -> new Vista(texto(d, "nombre"),
                    "Activó su cuenta de estudiante" + (d.path("qrEnviado").asBoolean() ? " y recibió su QR por correo" : ""), null,
                    datos(d, "codigoSis", "Código SIS", "correo", "Correo"));
            case "ESTUDIANTE_CREADO" -> new Vista(texto(d, "nombre"), "Registró al estudiante", null,
                    datos(d, "codigoSis", "Código SIS"));
            case "ESTUDIANTE_EDITADO" -> new Vista(texto(d, "nombre"), "Editó los datos del estudiante", null,
                    datos(d, "codigoSis", "Código SIS"));
            case "ESTUDIANTES_IMPORTADOS", "USUARIOS_IMPORTADOS" -> importacion(accion, d);
            case "ESTUDIANTE_FOTO_CAMBIADA" -> deEstudiante(d, "Cambió la foto del estudiante");
            case "ESTUDIANTE_FOTO_QUITADA" -> deEstudiante(d, "Quitó la foto del estudiante");
            case "QR_REGENERADO" -> deEstudiante(d, "Generó un QR nuevo y lo envió al correo del estudiante");
            case "FOTO_APROBADA" -> deEstudiante(d, "Aprobó la foto que envió el estudiante");
            case "FOTO_RECHAZADA" -> deEstudiante(d, "Rechazó la foto que envió el estudiante");
            case "FOTO_REPORTADA" -> new Vista(estudiante(d.path("idEstudiante").asInt()),
                    "Reportó que la foto no coincide" + (d.has("idExamen") ? " en " + examen(d) : ""),
                    texto(d, "motivo"), List.of());
            case "FOTO_REPORTE_DESCARTADO" -> deEstudiante(d, "Descartó el reporte de la foto: la foto es correcta");
            case "INGRESO_AUTORIZADO" -> enExamen(d, d.path("manual").asBoolean()
                    ? "Autorizó el ingreso manual de " : "Autorizó el ingreso de ");
            case "INGRESO_DENEGADO" -> enExamen(d, "Denegó el ingreso de ");
            case "SALIDA_REGISTRADA" -> enExamen(d, "Registró la salida de ");
            case "EXPULSION_REGISTRADA" -> enExamen(d, "Expulsó a ");
            case "EXPULSION_ANULADA" -> enExamen(d, "Anuló la expulsión de ");
            case "EVIDENCIA_AGREGADA" -> new Vista(examen(d), "Agregó " + plural(d.path("archivos").asInt(),
                    "evidencia", "evidencias") + " a una expulsión", null, List.of());
            case "ESTUDIANTE_TRASLADADO" -> {
                Vista v = enExamen(d, "Trasladó de aula a ");
                yield new Vista(v.objetivo(), v.resumen(), v.motivo(),
                        List.of(new Diferencia("Aula", texto(d, "aulaOrigen"), texto(d, "aulaDestino"))));
            }
            case "EXCEPCION_REGISTRADA" -> {
                Vista v = enExamen(d, "Registró una excepción (no habilitado) de ");
                yield new Vista(v.objetivo(), v.resumen(), v.motivo(), datos(d, "accion", "Acción tomada"));
            }
            case "INTENTO_INGRESO_REGISTRADO" -> enExamen(d, "Registró un intento de ingreso incorrecto de ");
            case "AULA_INCORRECTA_REGISTRADA" -> {
                Vista v = enExamen(d, "Registró que se presentó en otra aula: ");
                yield new Vista(v.objetivo(), v.resumen(), null, datos(d, "aula", "Aula donde se presentó"));
            }
            case "QR_DUPLICADO_REPORTADO" -> {
                Vista v = enExamen(d, "Reportó un QR duplicado de ");
                yield new Vista(v.objetivo(), v.resumen(), v.motivo(), datos(d, "presentado", "Quien lo presentó"));
            }
            case "MATERIAS_ASIGNADAS" -> {
                List<Diferencia> materias = new ArrayList<>();
                d.path("idMaterias").forEach(m -> materias.add(new Diferencia("Materia", null, materia(m.asInt()))));
                yield new Vista(usuario(d.path("idUsuario").asInt()), "Asignó " + plural(materias.size(), "materia", "materias")
                        + " al docente", null, materias);
            }
            case "CONTRASENA_CAMBIADA" -> new Vista("Su cuenta", "Cambió su contraseña", null, List.of());
            case "MI_FOTO_CAMBIADA" -> new Vista("Su cuenta", "Cambió su foto de perfil", null, List.of());
            case "MI_FOTO_QUITADA" -> new Vista("Su cuenta", "Quitó su foto de perfil", null, List.of());
            case "AYUDA_ATENDIDA" -> new Vista(texto(d, "nombre"),
                    "Atendió la consulta (" + texto(d, "tipo") + ")" + (d.has("respuesta") ? " y respondió por correo" : ""),
                    null, datos(d, "correo", "Correo", "respuesta", "Respuesta"));
            case "AMBIENTE_CREADO" -> new Vista("Aula " + texto(d, "nombre"), "Registró el aula", null,
                    datos(d, "capacidad", "Aforo", "ubicacion", "Ubicación"));
            case "AMBIENTE_AFORO_CAMBIADO" -> new Vista("Aula " + texto(d, "nombre"), "Registró el aforo del aula", null,
                    datos(d, "capacidad", "Aforo"));
            default -> new Vista(null, capital(accion.replace('_', ' ')), texto(d, "motivo"), List.of());
        };
    }

    // ---- Exámenes ----

    private Vista habilitacion(JsonNode d) {
        String estado = HABILITACION.getOrDefault(texto(d, "estado"), capital(texto(d, "estado")));
        List<Diferencia> cambios = new ArrayList<>();
        for (JsonNode e : d.path("estudiantes")) {
            cambios.add(new Diferencia(estudiante(e.path("idEstudiante").asInt()),
                    HABILITACION.getOrDefault(texto(e, "estadoAnterior"), "—"), estado));
        }
        int n = cambios.size();
        String quienes = n == 1 ? cambios.get(0).campo() : plural(n, "estudiante", "estudiantes");
        String verbo = "HABILITADO".equals(texto(d, "estado")) ? "Habilitó a " + quienes
                : "NO_HABILITADO".equals(texto(d, "estado")) ? "Marcó como no habilitado a " + quienes
                : "Dejó en " + estado.toLowerCase(Locale.ROOT) + " a " + quienes;
        return new Vista(examen(d), verbo, texto(d, "motivo"), cambios);
    }

    /** «Expulsó a Ana Pérez» con el examen como objetivo y el motivo aparte. */
    private Vista enExamen(JsonNode d, String verbo) {
        return new Vista(examen(d), verbo + estudiante(d.path("idEstudiante").asInt()), texto(d, "motivo"), List.of());
    }

    private Vista deEstudiante(JsonNode d, String resumen) {
        return new Vista(estudiante(d.path("idEstudiante").asInt()), resumen, texto(d, "motivo"), List.of());
    }

    private Vista asociados(JsonNode d) {
        int n = d.path("asociados").asInt();
        String resumen = d.has("identificador") ? "Asoció al estudiante " + texto(d, "identificador")
                : d.path("inscritos").asBoolean() ? "Asoció a los inscritos del grupo: " + plural(n, "estudiante nuevo", "estudiantes nuevos")
                : "Asoció " + plural(n, "estudiante", "estudiantes");
        return new Vista(examen(d), resumen, null,
                datos(d, "yaAsociados", "Ya estaban asociados", "noEncontrados", "No encontrados"));
    }

    private static Vista importacion(String accion, JsonNode d) {
        String quienes = accion.startsWith("USUARIOS") ? "usuarios" : "estudiantes";
        String resumen = d.has("insertados")
                ? "Importó " + d.path("insertados").asInt() + " " + quienes + " (" + d.path("ignorados").asInt() + " ignorados)"
                : "Inició la importación de " + d.path("total").asInt() + " " + quienes;
        return new Vista(texto(d, "archivo"), resumen, null, List.of());
    }

    private static String lista(JsonNode nombres) {
        List<String> l = new ArrayList<>();
        nombres.forEach(n -> l.add(n.asText()));
        return String.join(", ", l);
    }

    /** Solo los campos que cambiaron (al crear, todos los que tienen valor, sin «antes»). */
    private List<Diferencia> diferenciasExamen(JsonNode antes, JsonNode despues) {
        List<Diferencia> lista = new ArrayList<>();
        CAMPOS_EXAMEN.forEach((campo, etiqueta) -> {
            String a = antes == null ? null : valorExamen(campo, antes.path(campo));
            String b = valorExamen(campo, despues.path(campo));
            if (antes == null ? b != null : !java.util.Objects.equals(a, b)) lista.add(new Diferencia(etiqueta, a, b));
        });
        return lista;
    }

    private String valorExamen(String campo, JsonNode v) {
        if (v == null || v.isMissingNode() || v.isNull() || v.asText().isBlank() || "null".equals(v.asText())) return null;
        return switch (campo) {
            case "fecha" -> fecha(v.asText());
            case "horaInicio" -> hora(v.asText());
            case "duracionMinutos" -> v.asInt() + " min";
            case "idAmbiente" -> ambiente(v.asInt());
            case "idDocente" -> usuario(v.asInt());
            case "idMateria" -> materia(v.asInt());
            case "modoReparto" -> "ALFABETICO".equalsIgnoreCase(v.asText()) ? "Alfabético" : capital(v.asText());
            default -> capital(v.asText());
        };
    }

    private static String cuando(JsonNode examen) {
        String f = fecha(examen.path("fecha").asText(null));
        String h = hora(examen.path("horaInicio").asText(null));
        if (f == null) return "";
        return " para el " + f + (h == null ? "" : " a las " + h);
    }

    private static String campos(List<Diferencia> cambios) {
        List<String> nombres = cambios.stream().map(c -> c.campo().toLowerCase(Locale.ROOT)).toList();
        if (nombres.size() == 1) return nombres.get(0);
        return String.join(", ", nombres.subList(0, nombres.size() - 1)) + " y " + nombres.get(nombres.size() - 1);
    }

    // ---- Roles ----

    private Vista rolEditado(JsonNode d) {
        List<Diferencia> cambios = permisos(d.has("permisosAntes") ? d.path("permisosAntes") : null, d.path("permisos"));
        int total = d.path("permisos").size();
        String resumen = !d.has("permisosAntes") ? "Guardó el rol con " + plural(total, "permiso", "permisos")
                : cambios.isEmpty() ? "Guardó el rol sin cambiar sus permisos"
                : "Cambió sus permisos: ahora tiene " + plural(total, "permiso", "permisos");
        return new Vista("Rol " + texto(d, "nombre"), resumen, null, cambios);
    }

    /** Con «antes»: uno por permiso agregado o quitado. Sin él: la lista de permisos que quedó. */
    private static List<Diferencia> permisos(JsonNode antes, JsonNode despues) {
        Set<String> nuevos = codigos(despues);
        List<Diferencia> lista = new ArrayList<>();
        if (antes == null) {
            nuevos.forEach(c -> lista.add(new Diferencia("Permiso", null, permiso(c))));
            return lista;
        }
        Set<String> previos = codigos(antes);
        nuevos.stream().filter(c -> !previos.contains(c)).forEach(c -> lista.add(new Diferencia("Agregado", null, permiso(c))));
        previos.stream().filter(c -> !nuevos.contains(c)).forEach(c -> lista.add(new Diferencia("Quitado", permiso(c), null)));
        return lista;
    }

    private static Set<String> codigos(JsonNode lista) {
        Set<String> s = new LinkedHashSet<>();
        lista.forEach(n -> s.add(n.asText()));
        return s;
    }

    private static String permiso(String codigo) {
        return Permiso.existe(codigo) ? Permiso.valueOf(codigo).descripcion() : codigo;
    }

    // ---- Contexto del examen ----

    private final Map<String, List<Dato>> contextos = new HashMap<>();

    /** Datos actuales del examen: los de un reprogramado son los nuevos (el cambio se ve en «Qué cambió»). */
    private List<Dato> contextoExamen(JsonNode d) {
        int idExamen = d.path("idExamen").asInt();
        Integer idParalelo = d.has("idParalelo") && !d.path("idParalelo").isNull() ? d.path("idParalelo").asInt() : null;
        return contextos.computeIfAbsent(idExamen + ":" + idParalelo, k -> {
            List<List<Dato>> r = jdbc.query("""
                    SELECT e.fecha, e.hora_inicio, e.duracion_minutos, a.nombre, u.nombre || ' ' || u.apellidos, e.estado
                    FROM examen e
                    LEFT JOIN ambiente a ON a.id_ambiente = e.id_ambiente
                    LEFT JOIN usuario u ON u.id_usuario = e.id_docente
                    WHERE e.id_examen = ?""" + (idParalelo == null ? "" : " AND e.id_paralelo = ?"), (rs, i) -> {
                        List<Dato> datos = new ArrayList<>();
                        LocalDate fecha = rs.getObject(1, LocalDate.class);
                        LocalTime inicio = rs.getObject(2, LocalTime.class);
                        int duracion = rs.getInt(3);
                        if (fecha != null) datos.add(new Dato("Fecha", fecha.format(FECHA)));
                        if (inicio != null) {
                            String horario = inicio.toString().substring(0, 5)
                                    + (duracion > 0 ? " – " + inicio.plusMinutes(duracion).toString().substring(0, 5) : "");
                            datos.add(new Dato("Horario", horario + (duracion > 0 ? " (" + duracion + " min)" : "")));
                        }
                        if (rs.getString(4) != null) datos.add(new Dato("Aula", rs.getString(4)));
                        if (rs.getString(5) != null) datos.add(new Dato("Docente", rs.getString(5)));
                        if (rs.getString(6) != null) datos.add(new Dato("Estado", capital(rs.getString(6))));
                        return datos;
                    }, argumentos(idExamen, idParalelo));
            return r.isEmpty() ? List.of() : r.get(0);
        });
    }

    /** Sin grupo no se manda el parámetro: PostgreSQL no deduce el tipo de un «? IS NULL» con null. */
    private static Object[] argumentos(int idExamen, Integer idParalelo) {
        return idParalelo == null ? new Object[]{idExamen} : new Object[]{idExamen, idParalelo};
    }

    // ---- Nombres (con memoria por consulta) ----

    private String examen(JsonNode d) {
        int idExamen = d.path("idExamen").asInt();
        Integer idParalelo = d.has("idParalelo") && !d.path("idParalelo").isNull() ? d.path("idParalelo").asInt() : null;
        if (idExamen == 0) return null;
        return nombre("examen:" + idExamen + ":" + idParalelo, () -> {
            List<String> r = jdbc.query("""
                    SELECT m.nombre, p.nombre_grupo FROM examen e
                    JOIN materia m ON m.id_materia = e.id_materia
                    LEFT JOIN paralelo p ON p.id_paralelo = e.id_paralelo
                    WHERE e.id_examen = ?""" + (idParalelo == null ? "" : " AND e.id_paralelo = ?"),
                    (rs, i) -> rs.getString(1) + (rs.getString(2) == null ? "" : " · " + rs.getString(2)),
                    argumentos(idExamen, idParalelo));
            return r.isEmpty() ? "Examen " + idExamen : r.get(0);
        });
    }

    private String estudiante(int id) {
        return nombre("est:" + id, () -> uno("SELECT nombre || ' ' || apellidos FROM estudiante WHERE id_estudiante = ?", id, "Estudiante " + id));
    }

    private String ambiente(int id) {
        return nombre("amb:" + id, () -> uno("SELECT nombre FROM ambiente WHERE id_ambiente = ?", id, "Aula " + id));
    }

    private String usuario(int id) {
        return nombre("usr:" + id, () -> uno("SELECT nombre || ' ' || apellidos FROM usuario WHERE id_usuario = ?", id, "Usuario " + id));
    }

    private String materia(int id) {
        return nombre("mat:" + id, () -> uno("SELECT nombre FROM materia WHERE id_materia = ?", id, "Materia " + id));
    }

    private String uno(String sql, int id, String siNoHay) {
        List<String> r = jdbc.queryForList(sql, String.class, id);
        return r.isEmpty() || r.get(0) == null ? siNoHay : r.get(0);
    }

    private String nombre(String clave, java.util.function.Supplier<String> buscar) {
        return nombres.computeIfAbsent(clave, k -> buscar.get());
    }

    // ---- Formato ----

    private static List<Diferencia> datos(JsonNode d, String... pares) {
        List<Diferencia> lista = new ArrayList<>();
        for (int i = 0; i < pares.length; i += 2) {
            String v = texto(d, pares[i]);
            if (v != null) lista.add(new Diferencia(pares[i + 1], null, "estado".equals(pares[i]) ? capital(v) : v));
        }
        return lista;
    }

    static String texto(JsonNode d, String campo) {
        JsonNode v = d.path(campo);
        return v.isMissingNode() || v.isNull() || v.asText().isBlank() ? null : v.asText();
    }

    private static String fecha(String iso) {
        try { return iso == null ? null : LocalDate.parse(iso).format(FECHA); } catch (Exception e) { return iso; }
    }

    private static String hora(String iso) {
        try { return iso == null ? null : LocalTime.parse(iso).toString().substring(0, 5); } catch (Exception e) { return iso; }
    }

    static String capital(String texto) {
        if (texto == null || texto.isBlank()) return texto;
        String t = texto.replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(t.charAt(0)) + t.substring(1);
    }

    private static String plural(int n, String uno, String varios) {
        return n + " " + (n == 1 ? uno : varios);
    }

    private static String tamano(long bytes) {
        return bytes >= 1024 * 1024 ? String.format(Locale.ROOT, "%.1f MB", bytes / 1048576.0)
                : Math.max(1, Math.round(bytes / 1024.0)) + " KB";
    }
}
