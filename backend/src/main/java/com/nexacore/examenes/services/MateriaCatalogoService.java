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

    @Transactional
    public MateriaConCarrerasResponse crear(MateriaRequest request) {
        String sigla = sigla(request.sigla());
        String nombre = nombre(request.nombre());
        exigirUnica(sigla, nombre, null);
        Materia materia = new Materia();
        materia.setSigla(sigla);
        materia.setNombre(nombre);
        materia.setActiva(true);
        materia = materiaRepository.save(materia);
        auditoriaService.registrar("MATERIA_CREADA", AuditoriaService.datos("materia", nombre, "sigla", sigla));
        if (request.idsCarrera() != null && !request.idsCarrera().isEmpty()) {
            materiaCarreraService.asignar(materia.getId(), request.idsCarrera());
        }
        return de(materia.getId());
    }

    @Transactional
    public MateriaConCarrerasResponse editar(Integer idMateria, MateriaRequest request) {
        Materia materia = buscar(idMateria);
        String sigla = sigla(request.sigla());
        String nombre = nombre(request.nombre());
        exigirUnica(sigla, nombre, idMateria);
        String antes = materia.getSigla() + " · " + materia.getNombre();
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

    /**
     * Importa materias desde un CSV: sigla, nombre y, opcional, carreras (por nombre o código, separadas por «|»).
     * Separador «;» o «,»; la primera fila puede ser el encabezado. Las siglas que ya existen no se tocan.
     */
    @Transactional
    public ImportacionMateriasResponse importar(byte[] archivo) {
        if (archivo == null || archivo.length == 0) throw new IllegalArgumentException("El archivo está vacío.");
        String texto = new String(archivo, StandardCharsets.UTF_8).replace("﻿", "");
        List<String> lineas = texto.lines().map(String::strip).filter(l -> !l.isEmpty()).toList();
        if (lineas.isEmpty()) throw new IllegalArgumentException("El archivo está vacío.");
        String separador = lineas.get(0).contains(";") ? ";" : ",";
        int desde = TextoBusqueda.sinTildes(lineas.get(0)).contains("sigla") ? 1 : 0;
        if (lineas.size() - desde > MAX_FILAS) {
            throw new IllegalArgumentException("El archivo tiene más de " + MAX_FILAS + " materias: divídelo en partes.");
        }
        List<Carrera> carreras = carreraRepository.findAll();
        List<String> creadas = new ArrayList<>();
        List<String> existentes = new ArrayList<>();
        List<String> errores = new ArrayList<>();
        Set<String> siglasDelArchivo = new java.util.HashSet<>();
        for (int i = desde; i < lineas.size(); i++) {
            int fila = i + 1;
            String[] c = lineas.get(i).split(Pattern.quote(separador), -1);
            try {
                if (c.length < 2) throw new IllegalArgumentException("faltan columnas: se espera sigla" + separador + "nombre");
                String sigla = sigla(quitarComillas(c[0]));
                String nombre = nombre(quitarComillas(c[1]));
                if (!siglasDelArchivo.add(sigla)) throw new IllegalArgumentException("la sigla " + sigla + " está repetida en el archivo");
                if (materiaRepository.findBySiglaIgnoreCase(sigla).isPresent()) {
                    existentes.add(sigla);
                    continue;
                }
                List<Integer> idsCarrera = c.length > 2 ? carrerasDe(quitarComillas(c[2]), carreras) : List.of();
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
        if (!creadas.isEmpty()) {
            auditoriaService.registrar("MATERIAS_IMPORTADAS", AuditoriaService.datos("creadas", creadas.size(),
                    "existentes", existentes.isEmpty() ? null : existentes.size(), "errores", errores.isEmpty() ? null : errores.size()));
        }
        return new ImportacionMateriasResponse(creadas.size(), existentes, errores);
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
