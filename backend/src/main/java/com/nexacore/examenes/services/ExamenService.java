package com.nexacore.examenes.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacore.examenes.dto.ActualizarExamenRequest;
import com.nexacore.examenes.dto.CrearExamenRequest;
import com.nexacore.examenes.dto.ExamenResponse;
import com.nexacore.examenes.dto.NormaParticularRequest;
import com.nexacore.examenes.exceptions.ConflictoAmbienteException;
import com.nexacore.examenes.models.Ambiente;
import com.nexacore.examenes.models.Docente;
import com.nexacore.examenes.models.Examen;
import com.nexacore.examenes.models.ExamenId;
import com.nexacore.examenes.models.Materia;
import com.nexacore.examenes.models.Paralelo;
import com.nexacore.examenes.models.ParaleloId;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.repositories.ParaleloRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ExamenService {

    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final MateriaRepository materiaRepository;
    private final DocenteRepository docenteRepository;
    private final ParaleloRepository paraleloRepository;
    private final ObjectMapper objectMapper;

    private static final Set<String> PALABRAS_VACIAS = Set.of(
            "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "EN", "AL", "PARA", "POR", "CON");

    @PersistenceContext
    private EntityManager entityManager;

    public ExamenService(
            ExamenRepository examenRepository,
            AmbienteRepository ambienteRepository,
            MateriaRepository materiaRepository,
            DocenteRepository docenteRepository,
            ParaleloRepository paraleloRepository,
            ObjectMapper objectMapper) {
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.materiaRepository = materiaRepository;
        this.docenteRepository = docenteRepository;
        this.paraleloRepository = paraleloRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ExamenResponse> listar() {
        return examenRepository.findAllByOrderByFechaDescHoraInicioDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ExamenResponse crear(CrearExamenRequest request) {
        Ambiente ambiente = ambienteRepository.findById(request.idAmbiente())
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));

        validarSinConflicto(request.idAmbiente(), request.fecha(), request.horaInicio(), request.duracionMinutos());

        Materia materia = resolverMateria(request.asignatura().trim());
        Docente docente = resolverDocente(request.docente().trim());
        Paralelo paralelo = resolverParalelo(materia, docente);

        Integer idExamen = ((Number) entityManager
                .createNativeQuery("SELECT nextval('examen_id_examen_seq')")
                .getSingleResult()).intValue();

        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(paralelo.getId().getIdParalelo());

        Examen examen = new Examen();
        examen.setId(examenId);
        examen.setIdMateria(materia.getId());
        examen.setIdDocente(docente.getIdUsuario());
        examen.setFecha(request.fecha());
        examen.setHoraInicio(request.horaInicio());
        examen.setDuracionMinutos(request.duracionMinutos());
        examen.setIdAmbiente(ambiente.getId());
        examen.setEstado("programado");
        examen.setNormas(serializarNormas(request.normasGenerales(), request.normasParticulares()));

        return toResponse(examenRepository.save(examen));
    }

    @Transactional
    public ExamenResponse actualizar(Integer idExamen, Integer idParalelo, ActualizarExamenRequest request) {
        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(idParalelo);

        Examen examen = examenRepository.findById(examenId)
                .orElseThrow(() -> new IllegalArgumentException("El examen indicado no existe"));

        Ambiente ambiente = ambienteRepository.findById(request.idAmbiente())
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));

        // Validar conflicto excluyendo el propio examen
        validarSinConflictoExcluyendo(
                request.idAmbiente(), request.fecha(), request.horaInicio(), request.duracionMinutos(),
                idExamen, idParalelo);

        Materia materia = resolverMateria(request.asignatura().trim());
        Docente docente = resolverDocente(request.docente().trim());

        examen.setIdMateria(materia.getId());
        examen.setIdDocente(docente.getIdUsuario());
        examen.setFecha(request.fecha());
        examen.setHoraInicio(request.horaInicio());
        examen.setDuracionMinutos(request.duracionMinutos());
        examen.setIdAmbiente(ambiente.getId());
        examen.setNormas(serializarNormas(request.normasGenerales(), request.normasParticulares()));

        return toResponse(examenRepository.save(examen));
    }

    @Transactional
    public void cancelar(Integer idExamen, Integer idParalelo) {
        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(idParalelo);

        Examen examen = examenRepository.findById(examenId)
                .orElseThrow(() -> new IllegalArgumentException("El examen indicado no existe"));
        examen.setEstado("cancelado");
        examenRepository.save(examen);
    }

    private void validarSinConflictoExcluyendo(
            Integer idAmbiente, java.time.LocalDate fecha, LocalTime inicio, int duracionMinutos,
            Integer idExamenExcluido, Integer idParaleloExcluido) {
        LocalTime fin = inicio.plusMinutes(duracionMinutos);
        for (Examen otro : examenRepository.findByAmbienteAndFecha(idAmbiente, fecha)) {
            if (otro.getId().getIdExamen().equals(idExamenExcluido)
                    && otro.getId().getIdParalelo().equals(idParaleloExcluido)) {
                continue; // es el propio examen editado
            }
            LocalTime otroInicio = otro.getHoraInicio();
            LocalTime otroFin = otroInicio.plusMinutes(otro.getDuracionMinutos());
            boolean solapa = inicio.isBefore(otroFin) && otroInicio.isBefore(fin);
            if (solapa) {
                throw new ConflictoAmbienteException(
                        "El ambiente ya tiene un examen el " + fecha
                                + " entre " + otroInicio + " y " + otroFin
                                + ". Elige otro horario o ambiente.");
            }
        }
    }

    private void validarSinConflicto(
            Integer idAmbiente, java.time.LocalDate fecha, LocalTime inicio, int duracionMinutos) {
        LocalTime fin = inicio.plusMinutes(duracionMinutos);
        for (Examen otro : examenRepository.findByAmbienteAndFecha(idAmbiente, fecha)) {
            LocalTime otroInicio = otro.getHoraInicio();
            LocalTime otroFin = otroInicio.plusMinutes(otro.getDuracionMinutos());
            boolean solapa = inicio.isBefore(otroFin) && otroInicio.isBefore(fin);
            if (solapa) {
                throw new ConflictoAmbienteException(
                        "El ambiente ya tiene un examen el " + fecha
                                + " entre " + otroInicio + " y " + otroFin
                                + ". Elige otro horario o ambiente.");
            }
        }
    }

    private Materia resolverMateria(String nombre) {
        return materiaRepository.findByNombreIgnoreCase(nombre)
                .map(this::corregirSiglaSiEsNombre)
                .orElseGet(() -> {
                    Materia m = new Materia();
                    m.setSigla(siglaUnicaDesdeNombre(nombre));
                    m.setNombre(nombre.toUpperCase(Locale.forLanguageTag("es-BO")));
                    return materiaRepository.save(m);
                });
    }

    private Materia corregirSiglaSiEsNombre(Materia materia) {
        if (!siglaEsNombreConcatenado(materia.getSigla(), materia.getNombre())) {
            return materia;
        }
        materia.setSigla(siglaUnicaDesdeNombre(materia.getNombre()));
        return materiaRepository.save(materia);
    }

    private boolean siglaEsNombreConcatenado(String sigla, String nombre) {
        if (sigla == null || sigla.isBlank() || sigla.contains("-")) {
            return false;
        }
        String compacta = compactar(sigla);
        if (compacta.length() <= 4) {
            return false;
        }
        String compactaNombre = compactar(nombre);
        return compactaNombre.startsWith(compacta)
                || compacta.startsWith(compactaNombre.substring(0, Math.min(8, compactaNombre.length())));
    }

    private String siglaUnicaDesdeNombre(String nombre) {
        String prefijo = prefijoDesdeNombre(nombre);
        int n = 101;
        String candidata = prefijo + "-" + n;
        while (materiaRepository.findBySiglaIgnoreCase(candidata).isPresent()) {
            n++;
            candidata = prefijo + "-" + n;
        }
        return candidata;
    }

    private String prefijoDesdeNombre(String nombre) {
        String normalizado = Normalizer.normalize(nombre, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9\\s]", " ");
        List<String> palabras = new ArrayList<>();
        for (String palabra : normalizado.trim().split("\\s+")) {
            if (palabra.isBlank() || PALABRAS_VACIAS.contains(palabra) || esNivel(palabra)) {
                continue;
            }
            palabras.add(palabra);
        }
        if (palabras.isEmpty()) {
            return "MAT";
        }
        if (palabras.size() == 1) {
            String unica = palabras.get(0);
            return unica.length() >= 3 ? unica.substring(0, 3) : unica;
        }
        StringBuilder iniciales = new StringBuilder();
        for (String palabra : palabras) {
            iniciales.append(palabra.charAt(0));
        }
        if (iniciales.length() >= 3) {
            return iniciales.substring(0, 3);
        }
        String ultima = palabras.get(palabras.size() - 1);
        for (int i = 1; i < ultima.length() && iniciales.length() < 3; i++) {
            iniciales.append(ultima.charAt(i));
        }
        String primera = palabras.get(0);
        for (int i = 1; i < primera.length() && iniciales.length() < 3; i++) {
            iniciales.append(primera.charAt(i));
        }
        return iniciales.toString();
    }

    private boolean esNivel(String palabra) {
        return palabra.matches("I|II|III|IV|V|VI|VII|VIII|IX|X") || palabra.matches("\\d+");
    }

    private String compactar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
    }

    private Docente resolverDocente(String texto) {
        List<Docente> matches = docenteRepository.findByNombreCompletoContaining(texto);
        if (matches.isEmpty()) {
            throw new IllegalArgumentException(
                    "No se encontró un docente registrado que coincida con: " + texto
                            + ". Registra al docente como usuario DOCENTE primero.");
        }
        return matches.get(0);
    }

    private Paralelo resolverParalelo(Materia materia, Docente docente) {
        return paraleloRepository
                .findFirstByMateriaAndDocente(materia.getId(), docente.getIdUsuario())
                .orElseGet(() -> {
                    Integer idParalelo = ((Number) entityManager
                            .createNativeQuery("SELECT nextval('paralelo_id_paralelo_seq')")
                            .getSingleResult()).intValue();
                    ParaleloId pid = new ParaleloId();
                    pid.setIdParalelo(idParalelo);
                    pid.setIdMateria(materia.getId());
                    pid.setIdDocente(docente.getIdUsuario());
                    Paralelo p = new Paralelo();
                    p.setId(pid);
                    p.setMateria(materia);
                    p.setDocente(docente);
                    p.setNombreGrupo("G1");
                    return paraleloRepository.save(p);
                });
    }

    private String serializarNormas(
            List<String> generales, List<NormaParticularRequest> particulares) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("generales", generales == null ? List.of() : generales);
        payload.put("particulares", particulares == null ? List.of() : particulares);
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("No se pudieron guardar las normas");
        }
    }

    @SuppressWarnings("unchecked")
    private ExamenResponse toResponse(Examen examen) {
        List<String> generales = List.of();
        List<NormaParticularRequest> particulares = List.of();
        if (examen.getNormas() != null && !examen.getNormas().isBlank()) {
            try {
                Map<String, Object> map = objectMapper.readValue(
                        examen.getNormas(), new TypeReference<>() {});
                Object g = map.get("generales");
                if (g instanceof List<?> list) {
                    generales = list.stream().map(String::valueOf).toList();
                }
                Object p = map.get("particulares");
                if (p != null) {
                    particulares = objectMapper.convertValue(p, new TypeReference<>() {});
                }
            } catch (JsonProcessingException ignored) {
                generales = List.of(examen.getNormas());
            }
        }

        var materia = materiaRepository.findById(examen.getIdMateria())
                .map(this::corregirSiglaSiEsNombre)
                .orElse(null);
        String asignatura = materia != null ? materia.getNombre() : "—";
        String sigla = materia != null ? materia.getSigla() : "—";
        String docenteNombre = docenteRepository.findById(examen.getIdDocente())
                .map(d -> d.getUsuario().getNombre() + " " + d.getUsuario().getApellidos())
                .orElse("—");
        String ambienteNombre = ambienteRepository.findById(examen.getIdAmbiente())
                .map(Ambiente::getNombre)
                .orElse("—");

        return new ExamenResponse(
                examen.getId().getIdExamen(),
                examen.getId().getIdParalelo(),
                asignatura,
                sigla,
                docenteNombre,
                examen.getFecha(),
                examen.getHoraInicio(),
                examen.getDuracionMinutos(),
                examen.getIdAmbiente(),
                ambienteNombre,
                examen.getEstado(),
                generales,
                particulares);
    }
}
