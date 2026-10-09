-- ============================================================
-- SIGEX — V13: Seed catálogo de asignaturas (HU3 / RF-EX)
-- El registro de examen ya no inventa materias: hay que elegir
-- una sugerencia del catálogo. Idempotente por nombre o sigla.
-- ============================================================

INSERT INTO public.materia (sigla, nombre)
SELECT v.sigla, v.nombre
FROM (VALUES
    ('INF-112', 'Introducción a la Programación'),
    ('INF-113', 'Programación I'),
    ('INF-131', 'Estructuras de Datos'),
    ('INF-211', 'Algoritmos y Complejidad'),
    ('INF-272', 'Base de Datos I'),
    ('INF-273', 'Base de Datos II'),
    ('INF-281', 'Ingeniería de Software'),
    ('INF-312', 'Sistemas Operativos'),
    ('INF-323', 'Redes de Computadoras'),
    ('MAT-101', 'Cálculo I'),
    ('FIS-101', 'Física I')
) AS v(sigla, nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM public.materia m
    WHERE m.nombre = v.nombre OR m.sigla = v.sigla
);
