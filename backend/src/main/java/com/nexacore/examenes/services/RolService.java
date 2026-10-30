package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.GuardarRolRequest;
import com.nexacore.examenes.dto.PermisoResponse;
import com.nexacore.examenes.dto.RolConPermisosResponse;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.exceptions.RolDuplicadoException;
import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.models.RolPermiso;
import com.nexacore.examenes.repositories.RolPermisoRepository;
import com.nexacore.examenes.repositories.RolRepository;
import com.nexacore.examenes.security.Permiso;
import com.nexacore.examenes.security.Permisos;
import com.nexacore.examenes.utils.ValidacionTextoLibre;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Roles y permisos (Configuración, solo ADMIN). Los roles del sistema siempre existen y tienen
 * permisos fijos; los roles extra se crean, se editan y se borran (si no tienen usuarios).
 */
@Service
public class RolService {

    /** Orden en pantalla: primero los del sistema, después los extra por nombre. */
    private static final List<String> ORDEN_SISTEMA = List.of(Permisos.ADMIN, "DOCENTE", "CONTROL");

    private final RolRepository rolRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final PermisoService permisoService;
    private final JdbcTemplate jdbc;

    public RolService(RolRepository rolRepository, RolPermisoRepository rolPermisoRepository,
                      PermisoService permisoService, JdbcTemplate jdbc) {
        this.rolRepository = rolRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.permisoService = permisoService;
        this.jdbc = jdbc;
    }

    public List<PermisoResponse> catalogo() {
        return Arrays.stream(Permiso.values()).map(p -> new PermisoResponse(p.name(), p.modulo(), p.descripcion(), p.soloAdmin())).toList();
    }

    @Transactional(readOnly = true)
    public List<RolConPermisosResponse> listar() {
        Map<Integer, Long> usuarios = new java.util.HashMap<>();
        jdbc.query("SELECT id_rol, COUNT(*) FROM usuario_rol GROUP BY id_rol", rs -> { usuarios.put(rs.getInt(1), rs.getLong(2)); });
        return rolRepository.findAll().stream()
                .filter(r -> !Rol.ESTUDIANTE.equals(r.getNombre()))
                .sorted(Comparator.comparingInt((Rol r) -> {
                    int i = ORDEN_SISTEMA.indexOf(r.getNombre());
                    return i < 0 ? ORDEN_SISTEMA.size() : i;
                }).thenComparing(Rol::getNombre))
                .map(r -> respuesta(r, usuarios.getOrDefault(r.getId(), 0L)))
                .toList();
    }

    @Transactional
    public RolConPermisosResponse crear(GuardarRolRequest request) {
        if (request.nombre() == null || request.nombre().isBlank()) {
            throw new IllegalArgumentException("El nombre del rol es obligatorio");
        }
        String nombre = request.nombre().strip();
        if (Permisos.esDelSistema(nombre) || rolRepository.findByNombre(nombre).isPresent()) {
            throw new RolDuplicadoException(nombre);
        }
        Rol rol = new Rol();
        rol.setNombre(nombre);
        rol.setDescripcion(descripcion(request.descripcion()));
        rol = rolRepository.saveAndFlush(rol);
        guardarPermisos(rol.getId(), request.permisos());
        return respuesta(rol, 0);
    }

    @Transactional
    public RolConPermisosResponse actualizar(Integer id, GuardarRolRequest request) {
        Rol rol = extra(id);
        rol.setDescripcion(descripcion(request.descripcion()));
        rolRepository.save(rol);
        rolPermisoRepository.borrarDelRol(id);
        rolPermisoRepository.flush();
        guardarPermisos(id, request.permisos());
        return respuesta(rol, contarUsuarios(id));
    }

    @Transactional
    public void eliminar(Integer id) {
        Rol rol = extra(id);
        long usuarios = contarUsuarios(id);
        if (usuarios > 0) {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "El rol " + rol.getNombre() + " tiene " + usuarios
                    + (usuarios == 1 ? " usuario asignado" : " usuarios asignados") + ": quítaselo antes de borrarlo.");
        }
        rolPermisoRepository.borrarDelRol(id);
        rolRepository.delete(rol);
        recargarAlConfirmar();
    }

    private Rol extra(Integer id) {
        Rol rol = rolRepository.findById(id)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "No se encontró el rol"));
        if (Permisos.esDelSistema(rol.getNombre())) {
            throw new ControlIngresoException(HttpStatus.CONFLICT,
                    "El rol " + rol.getNombre() + " es del sistema: siempre existe y sus permisos no se cambian.");
        }
        return rol;
    }

    private void guardarPermisos(Integer idRol, List<String> codigos) {
        var unicos = new LinkedHashSet<>(codigos == null ? List.<String>of() : codigos);
        if (unicos.isEmpty()) throw new IllegalArgumentException("Elige al menos un permiso para el rol");
        for (String c : unicos) {
            if (!Permiso.existe(c)) throw new IllegalArgumentException("Permiso desconocido: " + c);
            if (Permiso.valueOf(c).soloAdmin()) {
                throw new IllegalArgumentException("El permiso \"" + Permiso.valueOf(c).descripcion()
                        + "\" es solo del ADMIN: no se asigna a otros roles.");
            }
        }
        rolPermisoRepository.saveAll(unicos.stream().map(c -> new RolPermiso(idRol, c)).toList());
        recargarAlConfirmar();
    }

    /** La caché de permisos se recarga cuando el cambio ya está guardado. */
    private void recargarAlConfirmar() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    permisoService.recargar();
                }
            });
        } else {
            permisoService.recargar();
        }
    }

    private long contarUsuarios(Integer idRol) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM usuario_rol WHERE id_rol = ?", Long.class, idRol);
        return n == null ? 0 : n;
    }

    private static String descripcion(String texto) {
        return ValidacionTextoLibre.validarOpcional(texto, "La descripción", 5, 200);
    }

    private RolConPermisosResponse respuesta(Rol rol, long usuarios) {
        boolean sistema = Permisos.esDelSistema(rol.getNombre());
        List<String> permisos = sistema
                ? Permisos.porDefecto(rol.getNombre()).stream().sorted(Comparator.comparingInt(c -> Permiso.valueOf(c).ordinal())).toList()
                : rolPermisoRepository.findByIdRol(rol.getId()).stream().map(RolPermiso::getCodigoPermiso)
                        .sorted(Comparator.comparingInt(c -> Permiso.existe(c) ? Permiso.valueOf(c).ordinal() : Integer.MAX_VALUE)).toList();
        String descripcion = rol.getDescripcion() != null ? rol.getDescripcion() : switch (rol.getNombre()) {
            case "ADMIN" -> "Administra todo el sistema.";
            case "DOCENTE" -> "Gestiona y controla sus propios exámenes.";
            case "CONTROL" -> "Registra los ingresos en todos los exámenes.";
            default -> null;
        };
        return new RolConPermisosResponse(rol.getId(), rol.getNombre(), descripcion, sistema, permisos, usuarios);
    }
}
