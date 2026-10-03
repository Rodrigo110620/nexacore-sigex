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
import com.nexacore.examenes.models.Usuario;
import com.nexacore.examenes.repositories.AmbienteRepository;
import com.nexacore.examenes.repositories.DocenteRepository;
import com.nexacore.examenes.repositories.ExamenRepository;
import com.nexacore.examenes.repositories.MateriaRepository;
import com.nexacore.examenes.repositories.ParaleloRepository;
import com.nexacore.examenes.repositories.UsuarioRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ExamenService {

    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final MateriaRepository materiaRepository;
    private final DocenteRepository docenteRepository;
    private final ParaleloRepository paraleloRepository;
    private final UsuarioRepository usuarioRepository;
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
            UsuarioRepository usuarioRepository,
            ObjectMapper objectMapper) {
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.materiaRepository = materiaRepository;
        this.docenteRepository = docenteRepository;
        this.paraleloRepository = paraleloRepository;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ExamenResponse> listar() {
        return examenesVisibles().stream()
                .map(this::toResponse)
                .toList();
    }

    private List<Examen> examenesVisibles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (tieneRol(auth, "ROLE_DOCENTE") && !tieneRol(auth, "ROLE_ADMIN")) {
            Integer idDocente = usuarioRepository.findByEmail(auth.getName())
                    .map(Usuario::getId)
                    .orElse(-1);
            return examenRepository.findByIdDocenteOrderByFechaDescHoraInicioDesc(idDocente);
        }
        return examenRepository.findAllByOrderByFechaDescHoraInicioDesc();
    }

    private static boolean tieneRol(Authentication auth, String role) {
        if (auth == null) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (role.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public ExamenResponse crear(CrearExamenRequest request) {
        Ambiente ambiente = ambienteRepository.findById(request.idAmbiente())
                .orElseThrow(() -> new IllegalArgumentException("El ambiente indicado no existe"));

        validarNoPasado(request.fecha(), request.horaInicio());
        validarSinConflicto(request.idAmbiente(), request.fecha(), request.horaInicio(), request.duracionMinutos(),
                null);

        Materia materia = resolverMateria(request.idMateria(), request.asignatura().trim());
        Docente docente = resolverDocente(request.idDocente(), request.docente().trim());
        validarDocenteLibre(docente.getIdUsuario(), request.fecha(), request.horaInicio(),
                request.duracionMinutos(), null);
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
        validarNormasNuevas(request.normasGenerales(), request.normasParticulares(), NormasGuardadas.VACIAS);
        examen.setNormas(serializarNormas(new NormasGuardadas(
                listaSegura(request.normasGenerales()), listaSegura(request.normasParticulares()),
                List.of(), List.of())));

        Examen guardado = examenRepository.save(examen);
        registrarAuditoria("EXAMEN_CREADO", Map.of(
                "idExamen", guardado.getId().getIdExamen(),
                "idParalelo", guardado.getId().getIdParalelo(),
                "examen", resumen(guardado)));
        return toResponse(guardado);
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

        boolean cambiaHorario = !request.fecha().equals(examen.getFecha())
                || !request.horaInicio().equals(examen.getHoraInicio());
        if (cambiaHorario) {
            validarNoPasado(request.fecha(), request.horaInicio());
        }

        // Validar conflicto excluyendo el propio examen
        validarSinConflicto(
                request.idAmbiente(), request.fecha(), request.horaInicio(), request.duracionMinutos(), idExamen);

        Materia materia = resolverMateria(request.idMateria(), request.asignatura().trim());
        Docente docente = resolverDocente(request.idDocente(), request.docente().trim());
        validarDocenteLibre(docente.getIdUsuario(), request.fecha(), request.horaInicio(),
                request.duracionMinutos(), idExamen);

        Map<String, Object> antes = resumen(examen);
        NormasGuardadas previas = leerNormas(examen.getNormas());
        validarNormasNuevas(request.normasGenerales(), request.normasParticulares(), previas);
        String normas = serializarNormas(combinarEliminadas(previas, request));

        boolean cambiaParalelo = !materia.getId().equals(examen.getIdMateria())
                || !docente.getIdUsuario().equals(examen.getIdDocente());
        if (cambiaParalelo) {
            examen = moverAParalelo(examen, resolverParalelo(materia, docente));
        }

        examen.setFecha(request.fecha());
        examen.setHoraInicio(request.horaInicio());
        examen.setDuracionMinutos(request.duracionMinutos());
        examen.setIdAmbiente(ambiente.getId());
        examen.setNormas(normas);

        Examen guardado = examenRepository.save(examen);
        registrarAuditoria("EXAMEN_MODIFICADO", Map.of(
                "idExamen", idExamen,
                "idParaleloAnterior", idParalelo,
                "idParalelo", guardado.getId().getIdParalelo(),
                "antes", antes,
                "despues", resumen(guardado)));
        return toResponse(guardado);
    }

    /**
     * id_paralelo forma parte de la PK del examen y de la FK compuesta a paralelo
     * (id_paralelo, id_materia, id_docente), así que cambiar asignatura o docente
     * exige mover el examen al paralelo correspondiente.
     */
    private Examen moverAParalelo(Examen examen, Paralelo destino) {
        Integer idExamen = examen.getId().getIdExamen();
        Integer idParaleloActual = examen.getId().getIdParalelo();
        Number dependientes = (Number) entityManager.createNativeQuery("""
                SELECT (SELECT COUNT(*) FROM public.asistencia_examen WHERE id_examen = :e AND id_paralelo = :p)
                     + (SELECT COUNT(*) FROM public.intento_ingreso WHERE id_examen = :e AND id_paralelo = :p)
                     + (SELECT COUNT(*) FROM public.registro_control_ingreso WHERE id_examen = :e AND id_paralelo = :p)
                     + (SELECT COUNT(*) FROM public.incidencia WHERE id_examen = :e AND id_paralelo = :p)
                """)
                .setParameter("e", idExamen)
                .setParameter("p", idParaleloActual)
                .getSingleResult();
        if (dependientes.longValue() > 0) {
            throw new ConflictoAmbienteException(
                    "No se puede cambiar la asignatura o el docente: el examen ya tiene estudiantes habilitados "
                            + "o registros de ingreso. Registra un examen nuevo para la otra asignatura.");
        }

        ParaleloId destinoId = destino.getId();
        entityManager.flush();
        entityManager.detach(examen);
        entityManager.createNativeQuery("""
                UPDATE public.examen
                   SET id_paralelo = :np, id_materia = :m, id_docente = :d
                 WHERE id_examen = :e AND id_paralelo = :p
                """)
                .setParameter("np", destinoId.getIdParalelo())
                .setParameter("m", destinoId.getIdMateria())
                .setParameter("d", destinoId.getIdDocente())
                .setParameter("e", idExamen)
                .setParameter("p", idParaleloActual)
                .executeUpdate();

        ExamenId nuevoId = new ExamenId();
        nuevoId.setIdExamen(idExamen);
        nuevoId.setIdParalelo(destinoId.getIdParalelo());
        return examenRepository.findById(nuevoId)
                .orElseThrow(() -> new IllegalStateException("No se pudo mover el examen al nuevo paralelo"));
    }

    @Transactional
    public void cancelar(Integer idExamen, Integer idParalelo) {
        ExamenId examenId = new ExamenId();
        examenId.setIdExamen(idExamen);
        examenId.setIdParalelo(idParalelo);

        Examen examen = examenRepository.findById(examenId)
                .orElseThrow(() -> new IllegalArgumentException("El examen indicado no existe"));
        String estadoAnterior = examen.getEstado();
        examen.setEstado("cancelado");
        examenRepository.save(examen);
        registrarAuditoria("EXAMEN_CANCELADO", Map.of(
                "idExamen", idExamen,
                "idParalelo", idParalelo,
                "estadoAnterior", estadoAnterior == null ? "" : estadoAnterior));
    }

    /** idExamenExcluido: el propio examen al editar (id_examen es único), o null al crear. */
    private void validarSinConflicto(
            Integer idAmbiente, java.time.LocalDate fecha, LocalTime inicio, int duracionMinutos,
            Integer idExamenExcluido) {
        Examen otro = primerSolapado(examenRepository.findByAmbienteAndFecha(idAmbiente, fecha),
                inicio, duracionMinutos, idExamenExcluido);
        if (otro != null) {
            throw new ConflictoAmbienteException(
                    "El ambiente ya tiene un examen el " + fecha
                            + " entre " + otro.getHoraInicio() + " y " + finDe(otro)
                            + ". Elige otro horario o ambiente.");
        }
    }

    /** Un docente no puede tener dos exámenes que se crucen, aunque sean en ambientes distintos. */
    private void validarDocenteLibre(
            Integer idDocente, java.time.LocalDate fecha, LocalTime inicio, int duracionMinutos,
            Integer idExamenExcluido) {
        Examen otro = primerSolapado(examenRepository.findByDocenteAndFecha(idDocente, fecha),
                inicio, duracionMinutos, idExamenExcluido);
        if (otro != null) {
            throw new ConflictoAmbienteException(
                    "El docente ya tiene un examen el " + fecha
                            + " entre " + otro.getHoraInicio() + " y " + finDe(otro)
                            + ". Elige otro horario o docente.");
        }
    }

    private static Examen primerSolapado(
            List<Examen> examenes, LocalTime inicio, int duracionMinutos, Integer idExamenExcluido) {
        LocalTime fin = inicio.plusMinutes(duracionMinutos);
        for (Examen otro : examenes) {
            if (otro.getId().getIdExamen().equals(idExamenExcluido)) {
                continue;
            }
            if (inicio.isBefore(finDe(otro)) && otro.getHoraInicio().isBefore(fin)) {
                return otro;
            }
        }
        return null;
    }

    private static LocalTime finDe(Examen examen) {
        return examen.getHoraInicio().plusMinutes(examen.getDuracionMinutos());
    }

    private void validarNoPasado(java.time.LocalDate fecha, LocalTime horaInicio) {
        java.time.LocalDate hoy = java.time.LocalDate.now();
        if (fecha.isBefore(hoy)) {
            throw new IllegalArgumentException("No se permite registrar un examen con fecha anterior a hoy.");
        }
        if (fecha.isEqual(hoy) && horaInicio.isBefore(LocalTime.now().withSecond(0).withNano(0))) {
            throw new IllegalArgumentException("Para hoy, la hora de inicio no puede ser anterior a la hora actual.");
        }
    }

    private Materia resolverMateria(Integer idMateria, String nombre) {
        if (idMateria != null) {
            return materiaRepository.findById(idMateria)
                    .map(this::corregirSiglaSiEsNombre)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "La asignatura seleccionada no existe en el catálogo institucional."));
        }
        String texto = nombre == null ? "" : nombre.trim();
        return materiaRepository.findByNombreIgnoreCase(texto)
                .or(() -> materiaRepository.findBySiglaIgnoreCase(texto))
                .map(this::corregirSiglaSiEsNombre)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No se encontró una asignatura en el catálogo institucional: " + texto
                                + ". Selecciona una sugerencia válida."));
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

    private Docente resolverDocente(Integer idDocente, String texto) {
        if (idDocente != null) {
            return docenteRepository.findById(idDocente)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "El docente seleccionado no está registrado como DOCENTE."));
        }
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

    /** Normas activas más las eliminadas lógicamente, que se conservan como historial. */
    private record NormasGuardadas(
            List<String> generales,
            List<NormaParticularRequest> particulares,
            List<String> generalesEliminadas,
            List<NormaParticularRequest> particularesEliminadas) {
        static final NormasGuardadas VACIAS = new NormasGuardadas(List.of(), List.of(), List.of(), List.of());
    }

    private static final int NORMA_MIN = 10;
    private static final int NORMA_MAX = 60;
    private static final Pattern LETRA = Pattern.compile("\\p{L}");

    private static <T> List<T> listaSegura(List<T> lista) {
        return lista == null ? List.of() : lista;
    }

    private NormasGuardadas leerNormas(String json) {
        if (json == null || json.isBlank()) {
            return NormasGuardadas.VACIAS;
        }
        try {
            Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {});
            return new NormasGuardadas(
                    textos(map.get("generales")),
                    particulares(map.get("particulares")),
                    textos(map.get("generalesEliminadas")),
                    particulares(map.get("particularesEliminadas")));
        } catch (JsonProcessingException e) {
            return new NormasGuardadas(List.of(json), List.of(), List.of(), List.of());
        }
    }

    private static List<String> textos(Object valor) {
        return valor instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of();
    }

    private List<NormaParticularRequest> particulares(Object valor) {
        return valor == null ? List.of() : objectMapper.convertValue(valor, new TypeReference<>() {});
    }

    private String serializarNormas(NormasGuardadas normas) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("generales", normas.generales());
        payload.put("particulares", normas.particulares());
        payload.put("generalesEliminadas", normas.generalesEliminadas());
        payload.put("particularesEliminadas", normas.particularesEliminadas());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("No se pudieron guardar las normas");
        }
    }

    /**
     * Solo se registran como eliminadas las normas que estaban guardadas; las que se agregaron
     * y quitaron en la misma edición nunca existieron en la base de datos.
     */
    private NormasGuardadas combinarEliminadas(NormasGuardadas previas, ActualizarExamenRequest request) {
        List<String> generalesEliminadas = new ArrayList<>(previas.generalesEliminadas());
        for (String texto : listaSegura(request.normasGeneralesEliminadas())) {
            if (previas.generales().contains(texto)) {
                generalesEliminadas.add(texto);
            }
        }
        List<NormaParticularRequest> particularesEliminadas = new ArrayList<>(previas.particularesEliminadas());
        for (NormaParticularRequest norma : listaSegura(request.normasParticularesEliminadas())) {
            if (previas.particulares().contains(norma)) {
                particularesEliminadas.add(norma);
            }
        }
        return new NormasGuardadas(
                listaSegura(request.normasGenerales()),
                listaSegura(request.normasParticulares()),
                generalesEliminadas,
                particularesEliminadas);
    }

    /**
     * Las normas ya guardadas no se revalidan, para no bloquear la edición de exámenes
     * registrados antes de estas reglas.
     */
    private void validarNormasNuevas(
            List<String> generales, List<NormaParticularRequest> particulares, NormasGuardadas previas) {
        Set<String> vistas = new HashSet<>();
        for (String texto : listaSegura(generales)) {
            if (!previas.generales().contains(texto)) {
                validarTextoNorma(texto, "general");
            }
            if (texto != null && !vistas.add(texto.trim().toLowerCase())) {
                throw new IllegalArgumentException("La norma general \"" + texto + "\" está repetida.");
            }
        }
        Set<String> vistasParticulares = new HashSet<>();
        for (NormaParticularRequest norma : listaSegura(particulares)) {
            if (norma.estudiante() == null || norma.estudiante().isBlank()) {
                throw new IllegalArgumentException("Cada norma particular debe indicar el estudiante.");
            }
            if (!previas.particulares().contains(norma)) {
                validarTextoNorma(norma.texto(), "particular");
            }
            String clave = norma.estudiante().trim().toLowerCase() + "|" + norma.texto().trim().toLowerCase();
            if (!vistasParticulares.add(clave)) {
                throw new IllegalArgumentException(
                        "La norma particular \"" + norma.texto() + "\" está repetida para " + norma.estudiante() + ".");
            }
        }
    }

    private static void validarTextoNorma(String texto, String tipo) {
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
        if (texto.replaceAll("\\s", "").matches("(?i)(.)\\1+")) {
            throw new IllegalArgumentException(prefijo + "no puede ser un mismo carácter repetido.");
        }
    }

    private Map<String, Object> resumen(Examen examen) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("idMateria", examen.getIdMateria());
        datos.put("idDocente", examen.getIdDocente());
        datos.put("idAmbiente", examen.getIdAmbiente());
        datos.put("fecha", String.valueOf(examen.getFecha()));
        datos.put("horaInicio", String.valueOf(examen.getHoraInicio()));
        datos.put("duracionMinutos", examen.getDuracionMinutos());
        datos.put("estado", examen.getEstado());
        datos.put("normas", examen.getNormas());
        return datos;
    }

    private void registrarAuditoria(String accion, Map<String, Object> detalles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return;
        }
        Integer idUsuario = usuarioRepository.findByEmail(auth.getName()).map(Usuario::getId).orElse(null);
        if (idUsuario == null) {
            return;
        }
        String json;
        try {
            json = objectMapper.writeValueAsString(detalles);
        } catch (JsonProcessingException e) {
            json = String.valueOf(detalles);
        }
        entityManager.createNativeQuery(
                        "INSERT INTO public.auditoria_operacion (id_usuario, accion, detalles) VALUES (:u, :a, :d)")
                .setParameter("u", idUsuario)
                .setParameter("a", accion)
                .setParameter("d", json)
                .executeUpdate();
    }

    private ExamenResponse toResponse(Examen examen) {
        NormasGuardadas normas = leerNormas(examen.getNormas());
        List<String> generales = normas.generales();
        List<NormaParticularRequest> particulares = normas.particulares();

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
                particulares,
                examen.getIdMateria(),
                examen.getIdDocente());
    }
}
