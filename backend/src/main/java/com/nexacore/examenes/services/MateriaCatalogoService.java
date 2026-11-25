package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.ImportacionMateriasResponse;
import com.nexacore.examenes.dto.MateriaConCarrerasResponse;
import com.nexacore.examenes.dto.MateriaRequest;
import com.nexacore.examenes.exceptions.ControlIngresoException;
import com.nexacore.examenes.models.Carrera;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.repositories.CarreraRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.utils.TextoBusqueda;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Catálogo de materias (V64), administrado desde Configuración → Materias: crear, editar, activar/desactivar e
 * importar desde un archivo. El catálogo es general; la oferta de cada semestre son los grupos del periodo.
 */
@Service
public class MateriaCatalogoService {

    static final int MAX_FILAS = 2000;
    private static final Pattern SIGLA = Pattern.compile("[A-Z0-9][A-Z0-9-]{1,14}");
    private static final Pattern NOMBRE = Pattern.compile("[\\p{L}0-9 ().,-]{3,100}");

    private final MateriaRepository materiaRepository;
    private final CarreraRepository carreraRepository;
    private final MateriaCarreraService materiaCarreraService;
    private final AuditoriaService auditoriaService;

    public MateriaCatalogoService(MateriaRepository materiaRepository, CarreraRepository carreraRepository,
                                  MateriaCarreraService materiaCarreraService, AuditoriaService auditoriaService) {
        this.materiaRepository = materiaRepository;
        this.carreraRepository = carreraRepository;
        this.materiaCarreraService = materiaCarreraService;
        this.auditoriaService = auditoriaService;
    }

    /** Sugiere la sigla cuando no se conoce la oficial; por campo para no cambiar el constructor. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private ExamenService examenService;

    @Transactional
    public MateriaConCarrerasResponse crear(MateriaRequest request) {
        String nombre = nombre(request.nombre());
        // Sin sigla: SIGEX sugiere una a partir del nombre y la marca como provisional hasta que se ponga la oficial.
        boolean provisional = request.sigla() == null || request.sigla().isBlank();
        String sigla = provisional ? sugerirSigla(nombre) : sigla(request.sigla());
        exigirUnica(sigla, nombre, null);
        Materia materia = new Materia();
        materia.setSigla(sigla);
        materia.setNombre(nombre);
        materia.setActiva(true);
        materia.setSiglaProvisional(provisional);
        materia = materiaRepository.save(materia);
        auditoriaService.registrar("MATERIA_CREADA", AuditoriaService.datos("materia", nombre, "sigla", sigla,
                "siglaProvisional", provisional ? true : null));
        if (request.idsCarrera() != null && !request.idsCarrera().isEmpty()) {
            materiaCarreraService.asignar(materia.getId(), request.idsCarrera());
        }
        return de(materia.getId());
    }

    @Transactional
    public MateriaConCarrerasResponse editar(Integer idMateria, MateriaRequest request) {
        Materia materia = buscar(idMateria);
        // Sin sigla se conserva la que tiene; una sigla distinta reemplaza a la provisional.
        String sigla = request.sigla() == null || request.sigla().isBlank() ? materia.getSigla() : sigla(request.sigla());
        String nombre = nombre(request.nombre());
        exigirUnica(sigla, nombre, idMateria);
        String antes = materia.getSigla() + " · " + materia.getNombre();
        if (!sigla.equalsIgnoreCase(materia.getSigla())) materia.setSiglaProvisional(false);
        materia.setSigla(sigla);
        materia.setNombre(nombre);
        materiaRepository.save(materia);
        if (request.idsCarrera() != null) materiaCarreraService.asignar(idMateria, request.idsCarrera());
        auditoriaService.registrar("MATERIA_EDITADA", AuditoriaService.datos("materia", nombre, "sigla", sigla, "antes", antes));
        return de(idMateria);
    }

    /** Desactivar no borra: la materia deja de ofrecerse, pero sus exámenes y grupos anteriores se conservan. */
    @Transactional
    public MateriaConCarrerasResponse cambiarEstado(Integer idMateria, boolean activa) {
        Materia materia = buscar(idMateria);
        if (materia.isActiva() != activa) {
            materia.setActiva(activa);
            materiaRepository.save(materia);
            auditoriaService.registrar(activa ? "MATERIA_ACTIVADA" : "MATERIA_DESACTIVADA",
                    AuditoriaService.datos("materia", materia.getNombre(), "sigla", materia.getSigla()));
        }
        return de(idMateria);
    }

    static final String[] COLUMNAS = {"sigla", "nombre", "carreras"};

    /** Plantilla vacía con dos filas de ejemplo (CSV con «;» y BOM, para que Excel en español la abra en columnas). */
    public byte[] plantillaCsv() {
        return csv(List.of(
                new String[]{"2010017", "Base de Datos I", "Ingeniería de Sistemas|Ingeniería Informática"},
                new String[]{"2008019", "Cálculo I", "Ingeniería de Sistemas|Ingeniería Civil"}));
    }

    public byte[] plantillaXlsx() {
        return CsvAExcel.convertir(plantillaCsv(), "Materias");
    }

    /** El catálogo actual, con las mismas columnas: se edita en Excel y se vuelve a importar para actualizarlo. */
    @Transactional(readOnly = true)
    public byte[] catalogoCsv() {
        if (materiaRepository.count() == 0) return plantillaCsv();
        return csv(materiaCarreraService.listar().stream()
                .map(m -> new String[]{m.sigla(), m.nombre(),
                        String.join("|", m.carreras().stream().map(MateriaConCarrerasResponse.CarreraDeMateria::nombre).toList())})
                .toList());
    }

    @Transactional(readOnly = true)
    public byte[] catalogoXlsx() {
        return CsvAExcel.convertir(catalogoCsv(), "Materias");
    }

    private static byte[] csv(List<String[]> filas) {
        var salida = new java.io.StringWriter();
        salida.write('\uFEFF');
        var formato = org.apache.commons.csv.CSVFormat.DEFAULT.builder().setDelimiter(';').setRecordSeparator("\n")
                .setHeader(COLUMNAS).build();
        try (var printer = new org.apache.commons.csv.CSVPrinter(salida, formato)) {
            for (String[] fila : filas) printer.printRecord((Object[]) fila);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("No se pudo generar el archivo.", e);
        }
        return salida.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Importa materias desde un CSV o Excel (.xlsx) con las columnas sigla, nombre y, opcional, carreras (por nombre o
     * código, separadas por «|»). Las siglas nuevas se crean; las que ya existen se actualizan (nombre y, si vienen,
     * carreras). Los errores se informan por fila y no detienen al resto.
     */
    @Transactional
    public ImportacionMateriasResponse importar(byte[] archivo, String nombreArchivo) {
        if (archivo == null || archivo.length == 0) throw new IllegalArgumentException("El archivo está vacío.");
        String nombreArch = nombreArchivo == null ? "" : nombreArchivo.toLowerCase(Locale.ROOT);
        if (!nombreArch.isEmpty() && !nombreArch.endsWith(".csv") && !nombreArch.endsWith(".xlsx")) {
            throw new IllegalArgumentException("El archivo debe ser CSV (.csv) o Excel (.xlsx).");
        }
        String texto = ExcelACsv.esExcel(nombreArchivo) ? ExcelACsv.convertir(archivo)
                : new String(archivo, StandardCharsets.UTF_8).replace("\uFEFF", "");
        if (texto.isBlank()) throw new IllegalArgumentException("El archivo está vacío.");
        List<org.apache.commons.csv.CSVRecord> registros;
        try (var parser = org.apache.commons.csv.CSVParser.parse(texto, org.apache.commons.csv.CSVFormat.DEFAULT.builder()
                .setDelimiter(LecturaCsv.detectarDelimitador(texto)).setIgnoreEmptyLines(true).setTrim(true).build())) {
            registros = parser.getRecords();
        } catch (java.io.IOException | java.io.UncheckedIOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo: revisa que tenga el formato de la plantilla.");
        }
        registros = registros.stream().filter(r -> r.stream().anyMatch(v -> v != null && !v.isBlank())).toList();
        if (registros.isEmpty()) throw new IllegalArgumentException("El archivo está vacío.");
        int desde = TextoBusqueda.sinTildes(registros.get(0).get(0)).contains("sigla") ? 1 : 0;
        if (registros.size() - desde == 0) throw new IllegalArgumentException("El archivo solo tiene el encabezado: agrega al menos una materia.");
        if (registros.size() - desde > MAX_FILAS) {
            throw new IllegalArgumentException("El archivo tiene más de " + MAX_FILAS + " materias: divídelo en partes.");
        }
        List<Carrera> carreras = carreraRepository.findAll();
        List<String> creadas = new ArrayList<>();
        List<String> actualizadas = new ArrayList<>();
        List<String> sinCambios = new ArrayList<>();
        List<String> errores = new ArrayList<>();
        Set<String> siglasDelArchivo = new java.util.HashSet<>();
        for (int i = desde; i < registros.size(); i++) {
            var r = registros.get(i);
            long fila = r.getRecordNumber();
            try {
                if (r.size() < 2) throw new IllegalArgumentException("faltan columnas: se espera sigla, nombre y (opcional) carreras");
                String sigla = sigla(r.get(0));
                String nombre = nombre(r.get(1));
                if (!siglasDelArchivo.add(sigla)) throw new IllegalArgumentException("la sigla " + sigla + " está repetida en el archivo");
                String campoCarreras = r.size() > 2 ? r.get(2) : "";
                List<Integer> idsCarrera = carrerasDe(campoCarreras, carreras);
                var existente = materiaRepository.findBySiglaIgnoreCase(sigla);
                if (existente.isPresent()) {
                    Materia m = existente.get();
                    boolean cambiaNombre = !m.getNombre().equals(nombre);
                    Set<Integer> actuales = new java.util.HashSet<>(materiaCarreraService.idsCarrera(m.getId()));
                    boolean cambianCarreras = !campoCarreras.isBlank() && !actuales.equals(new java.util.HashSet<>(idsCarrera));
                    if (!cambiaNombre && !cambianCarreras) { sinCambios.add(sigla); continue; }
                    if (cambiaNombre) { m.setNombre(nombre); materiaRepository.save(m); }
                    if (cambianCarreras) materiaCarreraService.asignar(m.getId(), idsCarrera);
                    actualizadas.add(sigla);
                    continue;
                }
                Materia materia = new Materia();
                materia.setSigla(sigla);
                materia.setNombre(nombre);
                materia.setActiva(true);
                materia = materiaRepository.save(materia);
                if (!idsCarrera.isEmpty()) materiaCarreraService.asignar(materia.getId(), idsCarrera);
                creadas.add(sigla);
            } catch (IllegalArgumentException | ControlIngresoException e) {
                errores.add("Fila " + fila + ": " + e.getMessage());
            }
        }
        if (!creadas.isEmpty() || !actualizadas.isEmpty()) {
            auditoriaService.registrar("MATERIAS_IMPORTADAS", AuditoriaService.datos("creadas", creadas.size(),
                    "actualizadas", actualizadas.isEmpty() ? null : actualizadas.size(),
                    "errores", errores.isEmpty() ? null : errores.size()));
        }
        return new ImportacionMateriasResponse(creadas.size(), actualizadas, sinCambios, errores);
    }

    /** Compatibilidad: un CSV sin nombre de archivo. */
    @Transactional
    public ImportacionMateriasResponse importar(byte[] archivo) {
        return importar(archivo, "materias.csv");
    }

    private String sugerirSigla(String nombre) {
        if (examenService != null) return examenService.siglaUnicaDesdeNombre(nombre);
        // Sin el servicio (pruebas unitarias): iniciales y un número libre.
        String base = java.util.Arrays.stream(TextoBusqueda.sinTildes(nombre).toUpperCase(Locale.ROOT).split("[^A-Z0-9]+"))
                .filter(p -> p.length() > 2).map(p -> p.substring(0, 1)).reduce("", String::concat);
        base = base.isEmpty() ? "MAT" : base;
        int n = 101;
        while (materiaRepository.findBySiglaIgnoreCase(base + "-" + n).isPresent()) n++;
        return base + "-" + n;
    }

    private List<Integer> carrerasDe(String campo, List<Carrera> carreras) {
        Set<Integer> ids = new LinkedHashSet<>();
        if (campo == null || campo.isBlank()) return List.of();
        for (String parte : campo.split("[|/]")) {
            String buscada = clave(parte);
            if (buscada.isEmpty()) continue;
            Optional<Carrera> carrera = carreras.stream().filter(k -> clave(k.getNombre()).equals(buscada)
                    || (k.getCodigo() != null && clave(k.getCodigo()).equals(buscada))).findFirst();
            ids.add(carrera.orElseThrow(() -> new IllegalArgumentException("no existe la carrera «" + parte.strip() + "»"))
                    .getId().getIdCarrera());
        }
        return List.copyOf(ids);
    }

    private static String clave(String texto) {
        return TextoBusqueda.sinTildes(texto == null ? "" : texto.strip().replaceAll("\\s+", " "));
    }

    private static String quitarComillas(String valor) {
        String v = valor == null ? "" : valor.strip();
        return v.length() >= 2 && v.startsWith("\"") && v.endsWith("\"") ? v.substring(1, v.length() - 1).strip() : v;
    }

    static String sigla(String valor) {
        String s = valor == null ? "" : valor.strip().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        if (s.isEmpty()) throw new IllegalArgumentException("La sigla es obligatoria");
        if (!SIGLA.matcher(s).matches()) {
            throw new IllegalArgumentException("La sigla «" + valor.strip() + "» no es válida: usa de 2 a 15 letras, números o guiones (p. ej. 2010017 o INF-112)");
        }
        return s;
    }

    static String nombre(String valor) {
        String n = valor == null ? "" : valor.strip().replaceAll("\\s+", " ");
        if (n.isEmpty()) throw new IllegalArgumentException("El nombre es obligatorio");
        if (!NOMBRE.matcher(n).matches() || n.chars().noneMatch(Character::isLetter)) {
            throw new IllegalArgumentException("El nombre «" + n + "» no es válido: de 3 a 100 caracteres, con letras");
        }
        return Character.toUpperCase(n.charAt(0)) + n.substring(1);
    }

    private void exigirUnica(String sigla, String nombre, Integer excepto) {
        materiaRepository.findBySiglaIgnoreCase(sigla).filter(m -> !m.getId().equals(excepto)).ifPresent(m -> {
            throw new ControlIngresoException(HttpStatus.CONFLICT, "Ya existe la materia con sigla " + sigla + ": " + m.getNombre() + ".");
        });
    }

    private Materia buscar(Integer idMateria) {
        return materiaRepository.findById(idMateria)
                .orElseThrow(() -> new ControlIngresoException(HttpStatus.NOT_FOUND, "La materia no existe."));
    }

    private MateriaConCarrerasResponse de(Integer idMateria) {
        return materiaCarreraService.listar().stream().filter(m -> m.idMateria().equals(idMateria)).findFirst().orElseThrow();
    }
}
