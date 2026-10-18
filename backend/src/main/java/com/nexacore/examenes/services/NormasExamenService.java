package com.nexacore.examenes.services;

import com.nexacore.examenes.dto.NormaParticularRequest;
import com.nexacore.examenes.models.AsistenciaExamen;
import com.nexacore.examenes.models.Estudiante;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.NormaExamen;
import com.nexacore.examenes.repositories.AsistenciaExamenRepository;
import com.nexacore.examenes.repositories.EstudianteRepository;
import com.nexacore.examenes.repositories.NormaExamenRepository;
import com.nexacore.examenes.utils.ValidacionPalabras;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Normas de los exámenes (MAST-03), guardadas en norma_examen (V34). Las normas generales aplican
 * a todos; las particulares, a un estudiante asociado al examen. Al editar, las que se quitan
 * quedan inactivas como historial.
 */
@Service
public class NormasExamenService {

    static final int NORMA_MIN = 10;
    static final int NORMA_MAX = 150;
    private static final Pattern LETRA = Pattern.compile("\\p{L}");
    /** Letras (con tildes y ñ), números, espacios y puntuación básica: "CI: original y vigente", "30 minutos". */
    private static final Pattern NORMA_CARACTERES = Pattern.compile("[\\p{L}0-9 .,;:()¿?¡!\"'/%\\-]+");
    /** Un mismo fragmento corto repetido sin sentido: "ababababab", "jajajajaja", "1212121212". */
    private static final Pattern PATRON_REPETIDO = Pattern.compile("(?i)(.{1,3})\\1{3,}");

    private final NormaExamenRepository normaRepository;
    private final EstudianteRepository estudianteRepository;
    private final AsistenciaExamenRepository asistenciaRepository;

    public NormasExamenService(NormaExamenRepository normaRepository,
                               EstudianteRepository estudianteRepository,
                               AsistenciaExamenRepository asistenciaRepository) {
        this.normaRepository = normaRepository;
        this.estudianteRepository = estudianteRepository;
        this.asistenciaRepository = asistenciaRepository;
    }

    /** Normas activas de un examen, con la forma que usa la API. */
    public record Normas(List<String> generales, List<NormaParticularRequest> particulares) {
        public static final Normas VACIAS = new Normas(List.of(), List.of());
    }

    public Normas leer(Integer idExamen) {
        return leerDe(List.of(idExamen)).getOrDefault(idExamen, Normas.VACIAS);
    }

    /** Normas activas de varios exámenes con dos consultas (normas y nombres de estudiantes). */
    public Map<Integer, Normas> leerDe(Collection<Integer> idsExamen) {
        if (idsExamen.isEmpty()) {
            return Map.of();
        }
        List<NormaExamen> filas = normaRepository.findByIdExamenInAndActivaTrueOrderByIdAsc(idsExamen);
        Map<Integer, String> nombres = nombresDe(filas);
        Map<Integer, List<NormaExamen>> porExamen = filas.stream()
                .collect(Collectors.groupingBy(NormaExamen::getIdExamen, LinkedHashMap::new, Collectors.toList()));
        Map<Integer, Normas> resultado = new HashMap<>();
        porExamen.forEach((idExamen, normas) -> resultado.put(idExamen, new Normas(
                normas.stream().filter(n -> !n.esParticular()).map(NormaExamen::getTexto).toList(),
                normas.stream().filter(NormaExamen::esParticular).map(n -> aRequest(n, nombres)).toList())));
        return resultado;
    }

    /** Normas generales y las particulares de un estudiante, para el control de ingreso. */
    public record NormasDeEstudiante(List<String> generales, List<String> particulares) {}

    public NormasDeEstudiante leerParaEstudiante(Integer idExamen, Integer idEstudiante, String nombreCompleto) {
        List<NormaExamen> activas = normaRepository.findByIdExamenAndActivaTrueOrderByIdAsc(idExamen);
        return new NormasDeEstudiante(
                activas.stream().filter(n -> !n.esParticular()).map(NormaExamen::getTexto).toList(),
                activas.stream()
                        .filter(NormaExamen::esParticular)
                        .filter(n -> esDelEstudiante(n, idEstudiante, nombreCompleto))
                        .map(NormaExamen::getTexto)
                        .toList());
    }

    /**
     * La norma particular se reconoce por el id del estudiante. El nombre solo se usa en las normas
     * guardadas antes de exigir el estudiante registrado, que no tienen id.
     */
    private static boolean esDelEstudiante(NormaExamen norma, Integer idEstudiante, String nombre) {
        if (norma.getIdEstudiante() != null) {
            return norma.getIdEstudiante().equals(idEstudiante);
        }
        return nombre != null && nombre.equalsIgnoreCase(norma.getNombreEstudiante());
    }

    /**
     * Normas de un examen nuevo. Las particulares no se aceptan: el examen todavía no tiene
     * estudiantes asociados, y la norma particular es para un estudiante del examen.
     */
    public void registrar(Integer idExamen, List<String> generales, List<NormaParticularRequest> particulares) {
        validarParaRegistro(generales, particulares);
        LocalDateTime ahora = LocalDateTime.now();
        List<NormaExamen> nuevas = new ArrayList<>();
        for (String texto : listaSegura(generales)) {
            nuevas.add(general(idExamen, texto, ahora));
        }
        normaRepository.saveAllAndFlush(nuevas);
    }

    /** Las normas de un examen nuevo, antes de guardarlo. */
    public void validarParaRegistro(List<String> generales, List<NormaParticularRequest> particulares) {
        if (!listaSegura(particulares).isEmpty()) {
            throw new IllegalArgumentException(
                    "Las normas particulares se agregan al editar el examen, después de asociar a los estudiantes.");
        }
        validarNuevas(listaSegura(generales), List.of(), Set.of(), Set.of(), null);
    }

    /**
     * Deja activas exactamente las normas recibidas: las que faltan quedan inactivas (historial) y
     * las nuevas se validan y se guardan. Las que ya estaban no se revalidan, para no bloquear la
     * edición de exámenes registrados antes de estas reglas.
     */
    public void actualizar(Examen examen, List<String> generales, List<NormaParticularRequest> particulares) {
        Integer idExamen = examen.getId().getIdExamen();
        List<NormaExamen> activas = normaRepository.findByIdExamenAndActivaTrueOrderByIdAsc(idExamen);
        Set<String> generalesPrevias = activas.stream().filter(n -> !n.esParticular())
                .map(n -> claveTexto(n.getTexto())).collect(Collectors.toSet());
        Set<String> particularesPrevias = activas.stream().filter(NormaExamen::esParticular)
                .map(NormasExamenService::clave).collect(Collectors.toSet());

        validarNuevas(listaSegura(generales), listaSegura(particulares), generalesPrevias, particularesPrevias, examen);

        Set<String> generalesPedidas = listaSegura(generales).stream()
                .filter(Objects::nonNull).map(NormasExamenService::claveTexto).collect(Collectors.toSet());
        Set<String> particularesPedidas = listaSegura(particulares).stream()
                .map(NormasExamenService::clave).collect(Collectors.toSet());

        LocalDateTime ahora = LocalDateTime.now();
        for (NormaExamen norma : activas) {
            boolean sigue = norma.esParticular()
                    ? particularesPedidas.contains(clave(norma))
                    : generalesPedidas.contains(claveTexto(norma.getTexto()));
            if (!sigue) {
                norma.setActiva(false);
                norma.setEliminadaEn(ahora);
            }
        }
        List<NormaExamen> cambios = new ArrayList<>(activas);
        for (String texto : listaSegura(generales)) {
            if (!generalesPrevias.contains(claveTexto(texto))) {
                cambios.add(general(idExamen, texto, ahora));
            }
        }
        for (NormaParticularRequest pedida : listaSegura(particulares)) {
            if (!particularesPrevias.contains(clave(pedida))) {
                NormaExamen norma = new NormaExamen();
                norma.setIdExamen(idExamen);
                norma.setTipo(NormaExamen.PARTICULAR);
                norma.setIdEstudiante(pedida.idEstudiante());
                norma.setNombreEstudiante(pedida.estudiante().strip());
                norma.setTexto(pedida.texto());
                norma.setCreadaEn(ahora);
                cambios.add(norma);
            }
        }
        normaRepository.saveAllAndFlush(cambios);
    }

    /** Las normas particulares del estudiante dejan de aplicar (p. ej. al quitarlo del examen). */
    public void desactivarDelEstudiante(Integer idExamen, Integer idEstudiante) {
        normaRepository.desactivarDelEstudiante(idExamen, idEstudiante, LocalDateTime.now());
    }

    /** Resumen de las normas activas para respuestas y auditoría: "general; general; …". */
    public String resumen(Integer idExamen) {
        return String.join("; ", leer(idExamen).generales());
    }

    private void validarNuevas(List<String> generales, List<NormaParticularRequest> particulares,
                               Set<String> generalesPrevias, Set<String> particularesPrevias, Examen examen) {
        Set<String> vistas = new HashSet<>();
        for (String texto : generales) {
            if (texto == null || !generalesPrevias.contains(claveTexto(texto))) {
                validarTexto(texto, "general");
            }
            if (!vistas.add(claveTexto(texto))) {
                throw new IllegalArgumentException("La norma general \"" + texto + "\" está repetida.");
            }
        }
        Set<String> vistasParticulares = new HashSet<>();
        for (NormaParticularRequest norma : particulares) {
            if (norma.estudiante() == null || norma.estudiante().isBlank()) {
                throw new IllegalArgumentException("Cada norma particular debe indicar el estudiante.");
            }
            if (!particularesPrevias.contains(clave(norma))) {
                validarTexto(norma.texto(), "particular");
                validarEstudiante(norma, examen);
            }
            // Por id si lo tiene: dos estudiantes con el mismo nombre pueden tener la misma norma.
            if (!vistasParticulares.add(clave(norma))) {
                throw new IllegalArgumentException(
                        "La norma particular \"" + norma.texto() + "\" está repetida para " + norma.estudiante() + ".");
            }
        }
    }

    /** La norma particular nueva es para un estudiante registrado, asociado al examen y no inhabilitado. */
    private void validarEstudiante(NormaParticularRequest norma, Examen examen) {
        Integer idEstudiante = norma.idEstudiante();
        if (idEstudiante == null || !estudianteRepository.existsById(idEstudiante)) {
            throw new IllegalArgumentException(
                    "Norma particular: selecciona un estudiante registrado (" + norma.estudiante() + ").");
        }
        List<AsistenciaExamen> asistencia = asistenciaRepository.buscarDelExamen(
                examen.getId().getIdExamen(), examen.getId().getIdParalelo(), Set.of(idEstudiante));
        if (asistencia.isEmpty()) {
            throw new IllegalArgumentException(
                    "Norma particular: " + norma.estudiante() + " no está asociado a este examen.");
        }
        if (Boolean.FALSE.equals(asistencia.get(0).getHabilitado())) {
            throw new IllegalArgumentException(
                    "Norma particular: " + norma.estudiante() + " no está habilitado para este examen.");
        }
    }

    static void validarTexto(String texto, String tipo) {
        String prefijo = "Norma " + tipo + ": ";
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException(prefijo + "no puede estar vacía.");
        }
        if (!texto.equals(texto.strip())) {
            throw new IllegalArgumentException(prefijo + "no se permiten espacios al inicio ni al final.");
        }
        if (texto.matches("(?s).*\\s{2,}.*")) {
            throw new IllegalArgumentException(prefijo + "no se permiten espacios dobles.");
        }
        if (texto.length() < NORMA_MIN || texto.length() > NORMA_MAX) {
            throw new IllegalArgumentException(
                    prefijo + "debe tener entre " + NORMA_MIN + " y " + NORMA_MAX + " caracteres.");
        }
        if (texto.matches("[\\d\\s]+")) {
            throw new IllegalArgumentException(prefijo + "no puede contener solo números.");
        }
        if (!LETRA.matcher(texto).find()) {
            throw new IllegalArgumentException(prefijo + "debe contener texto descriptivo.");
        }
        if (!NORMA_CARACTERES.matcher(texto).matches()) {
            throw new IllegalArgumentException(prefijo + "contiene caracteres no permitidos.");
        }
        String compacto = texto.replaceAll("\\s", "");
        if (compacto.matches("(?i)(.)\\1+")) {
            throw new IllegalArgumentException(prefijo + "no puede ser un mismo carácter repetido.");
        }
        if (PATRON_REPETIDO.matcher(compacto).matches()) {
            throw new IllegalArgumentException(prefijo + "no puede ser un patrón repetitivo sin significado.");
        }
        String garabato = ValidacionPalabras.primerGarabato(texto);
        if (garabato != null) {
            throw new IllegalArgumentException(
                    prefijo + "\"" + garabato + "\" no parece una palabra. Escribe la norma con palabras reales.");
        }
    }

    private static NormaExamen general(Integer idExamen, String texto, LocalDateTime ahora) {
        NormaExamen norma = new NormaExamen();
        norma.setIdExamen(idExamen);
        norma.setTipo(NormaExamen.GENERAL);
        norma.setTexto(texto);
        norma.setCreadaEn(ahora);
        return norma;
    }

    /** Nombre actual del estudiante (si sigue registrado) o el que se guardó con la norma. */
    private static NormaParticularRequest aRequest(NormaExamen norma, Map<Integer, String> nombres) {
        String nombre = norma.getIdEstudiante() != null
                ? nombres.getOrDefault(norma.getIdEstudiante(), norma.getNombreEstudiante())
                : norma.getNombreEstudiante();
        return new NormaParticularRequest(nombre, norma.getTexto(), norma.getIdEstudiante());
    }

    private Map<Integer, String> nombresDe(List<NormaExamen> normas) {
        Set<Integer> ids = normas.stream().map(NormaExamen::getIdEstudiante)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Integer, String> nombres = new HashMap<>();
        for (Estudiante e : estudianteRepository.findAllById(ids)) {
            nombres.put(e.getId(), (e.getNombre() + " " + e.getApellidos()).trim());
        }
        return nombres;
    }

    private static String claveTexto(String texto) {
        return texto == null ? "" : texto.strip().toLowerCase(Locale.ROOT);
    }

    /** Estudiante (por id si lo tiene, si no por nombre) y texto: identifica una norma particular. */
    private static String clave(NormaExamen norma) {
        String quien = norma.getIdEstudiante() != null
                ? "id:" + norma.getIdEstudiante() : "n:" + claveTexto(norma.getNombreEstudiante());
        return quien + "|" + claveTexto(norma.getTexto());
    }

    private static String clave(NormaParticularRequest norma) {
        String quien = norma.idEstudiante() != null
                ? "id:" + norma.idEstudiante() : "n:" + claveTexto(norma.estudiante());
        return quien + "|" + claveTexto(norma.texto());
    }

    private static <T> List<T> listaSegura(List<T> lista) {
        return lista == null ? List.of() : lista;
    }
}
