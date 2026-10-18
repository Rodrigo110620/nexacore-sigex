-- La V30 que existió un tiempo en develop creó ck_estudiante_telefono (8 dígitos que empiezan con
-- 5, 6 o 7). Se reemplazó por la V32 (chk_estudiante_telefono: 7 u 8 dígitos que empiezan con
-- 2, 3, 4, 6 o 7), pero en las bases donde la V30 llegó a aplicarse la restricción vieja sigue
-- activa y rechaza teléfonos válidos. En las demás bases no hace nada.
ALTER TABLE public.estudiante DROP CONSTRAINT IF EXISTS ck_estudiante_telefono;
