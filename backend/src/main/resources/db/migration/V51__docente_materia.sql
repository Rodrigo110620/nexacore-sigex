-- IMP-12: cada docente tiene sus materias. El ADMIN las asigna al registrarlo o desde Usuarios, y al
-- programar un examen el docente solo elige entre las suyas.
CREATE TABLE IF NOT EXISTS public.docente_materia (
    id_docente integer NOT NULL,
    id_materia integer NOT NULL,
    CONSTRAINT pk_docente_materia PRIMARY KEY (id_docente, id_materia),
    CONSTRAINT fk_docente_materia_docente FOREIGN KEY (id_docente) REFERENCES public.docente (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_docente_materia_materia FOREIGN KEY (id_materia) REFERENCES public.materia (id_materia) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_docente_materia_materia ON public.docente_materia (id_materia);

-- Los docentes que ya existen conservan las materias en las que tienen grupos (paralelos).
INSERT INTO public.docente_materia (id_docente, id_materia)
SELECT DISTINCT p.id_docente, p.id_materia
FROM public.paralelo p
JOIN public.docente d ON d.id_usuario = p.id_docente
ON CONFLICT DO NOTHING;
