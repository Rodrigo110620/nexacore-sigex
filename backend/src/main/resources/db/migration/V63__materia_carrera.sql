-- Plan de estudios: a qué carreras pertenece cada materia (una materia común, como Cálculo I, puede ser de varias).
-- Con esto no se mezclan materias con carreras que no les corresponden: a mano no se puede asociar a un examen a un
-- estudiante de otra carrera; los inscritos oficialmente en el grupo sí rinden. Una materia sin carreras definidas no
-- restringe a nadie (hasta que el administrador las cargue).
CREATE TABLE IF NOT EXISTS public.materia_carrera (
    id_materia  integer NOT NULL,
    id_carrera  integer NOT NULL,
    id_facultad integer NOT NULL,
    CONSTRAINT pk_materia_carrera PRIMARY KEY (id_materia, id_carrera),
    CONSTRAINT fk_materia_carrera_materia FOREIGN KEY (id_materia)
        REFERENCES public.materia (id_materia) ON DELETE CASCADE,
    CONSTRAINT fk_materia_carrera_carrera FOREIGN KEY (id_carrera, id_facultad)
        REFERENCES public.carrera (id_carrera, id_facultad) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_materia_carrera_carrera ON public.materia_carrera (id_carrera);

COMMENT ON TABLE public.materia_carrera IS 'Carreras a las que pertenece cada materia (plan de estudios).';

-- Carga inicial con los datos reales: cada materia queda en las carreras de los estudiantes inscritos en sus grupos.
INSERT INTO public.materia_carrera (id_materia, id_carrera, id_facultad)
SELECT DISTINCT ip.id_materia, ec.id_carrera, ec.id_facultad
FROM public.inscripcion_paralelo ip
JOIN public.estudiante_carrera ec ON ec.id_estudiante = ip.id_estudiante
ON CONFLICT DO NOTHING;
