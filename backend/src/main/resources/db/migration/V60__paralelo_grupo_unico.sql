-- Cada grupo de una materia tiene un solo docente: no puede haber dos «G1» de la misma materia. La aplicación ya
-- lo valida; este índice lo garantiza también ante dos asignaciones simultáneas. «1» y «G1» cuentan como el mismo.
-- Si ya hubiera grupos repetidos (datos viejos), no se crea el índice y se avisa en el registro, para no frenar el
-- despliegue: hay que corregirlos a mano y volver a crearlo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.paralelo
        GROUP BY id_materia, UPPER(REGEXP_REPLACE(TRIM(nombre_grupo), '^([0-9]+)$', 'G\1'))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE NOTICE 'Hay grupos repetidos en alguna materia: no se creó ux_paralelo_materia_grupo.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS ux_paralelo_materia_grupo
            ON public.paralelo (id_materia, UPPER(REGEXP_REPLACE(TRIM(nombre_grupo), '^([0-9]+)$', 'G\1')));
    END IF;
END $$;
