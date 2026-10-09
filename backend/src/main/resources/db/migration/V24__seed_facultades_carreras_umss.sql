-- ============================================================
-- SIGEX — V24: Catálogo de facultades y carreras de la UMSS
-- Fuentes: umss.edu.bo/facultades (14 facultades) y
-- websis.umss.edu.bo/umss_carreras.asp (carreras con su código SIS).
-- Se omiten los programas de complementación y las unidades
-- desconcentradas (Trópico, Valle de Sacta, Andina, Conosur).
-- FCyT y sus 8 carreras ya existen (V9/V10): se completan las que faltan.
-- Idempotente: no duplica por código de facultad ni por (facultad, nombre).
-- ============================================================

-- 1) Facultades
INSERT INTO public.facultad (codigo, nombre)
SELECT v.codigo, v.nombre
FROM (VALUES
    ('FAYCH',  'Facultad de Arquitectura y Ciencias del Hábitat'),
    ('FCAPYF', 'Facultad de Ciencias Agrícolas, Pecuarias y Forestales'),
    ('FCE',    'Facultad de Ciencias Económicas'),
    ('FCFYB',  'Facultad de Ciencias Farmacéuticas y Bioquímicas'),
    ('FCJYP',  'Facultad de Ciencias Jurídicas y Políticas'),
    ('FACSO',  'Facultad de Ciencias Sociales'),
    ('FCV',    'Facultad de Ciencias Veterinarias'),
    ('FDRYT',  'Facultad de Desarrollo Rural y Territorial'),
    ('FE',     'Facultad de Enfermería'),
    ('FHYCE',  'Facultad de Humanidades y Ciencias de la Educación'),
    ('MED',    'Facultad de Medicina'),
    ('FODO',   'Facultad de Odontología'),
    ('FPVA',   'Facultad Politécnica del Valle Alto')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM public.facultad f WHERE f.codigo = v.codigo OR f.nombre = v.nombre
);

-- 2) Carreras (código = código SIS de websis)
INSERT INTO public.carrera (codigo, nombre, id_facultad)
SELECT v.codigo, v.nombre, f.id_facultad
FROM (VALUES
    -- Arquitectura y Ciencias del Hábitat
    ('FAYCH', '202002', 'Arquitectura'),
    ('FAYCH', '231802', 'Turismo'),
    ('FAYCH', '127091', 'Planificación del Territorio y Medio Ambiente'),
    ('FAYCH', '122081', 'Diseño Gráfico y Comunicación Visual'),
    ('FAYCH', '156151', 'Diseño de Interiores y del Mobiliario'),
    ('FAYCH', '229801', 'Técnico Universitario Superior en Construcciones'),
    ('FAYCH', '161191', 'Técnico Universitario Medio en Etnoturismo Comunitario'),

    -- Ciencias Agrícolas, Pecuarias y Forestales
    ('FCAPYF', '718801', 'Ingeniería Agronómica'),
    ('FCAPYF', '019701', 'Ingeniería Agrícola'),
    ('FCAPYF', '117071', 'Ingeniería Agroindustrial'),
    ('FCAPYF', '649701', 'Ingeniería Fitotecnista'),
    ('FCAPYF', '730602', 'Ingeniería Forestal'),
    ('FCAPYF', '770201', 'Ingeniería Agronómica Zootecnista'),
    ('FCAPYF', '103020', 'Ingeniería Agronómica Tropical y Manejo de Recursos Naturales Renovables'),
    ('FCAPYF', '128091', 'Ingeniería del Medio Ambiente'),
    ('FCAPYF', '709701', 'Técnico Superior en Mecanización Agrícola'),
    ('FCAPYF', '135121', 'Técnico Universitario Superior en Gestión Territorial y Desarrollo Endógeno Sustentable'),

    -- Ciencias Económicas
    ('FCE', '109401', 'Administración de Empresas'),
    ('FCE', '089801', 'Contaduría Pública'),
    ('FCE', '059801', 'Economía'),
    ('FCE', '125091', 'Ingeniería Comercial'),
    ('FCE', '126091', 'Ingeniería Financiera'),

    -- Ciencias Farmacéuticas y Bioquímicas
    ('FCFYB', '049001', 'Bioquímica y Farmacia'),

    -- Ciencias Jurídicas y Políticas
    ('FCJYP', '279901', 'Ciencias Jurídicas'),
    ('FCJYP', '280101', 'Ciencia Política'),

    -- Ciencias Sociales
    ('FACSO', '150802', 'Sociología'),
    ('FACSO', '142131', 'Antropología'),
    ('FACSO', '164221', 'Historia'),

    -- Ciencias y Tecnología (las 8 de V9 ya existen y se omiten por nombre)
    ('FCYT', '399501', 'Biología'),
    ('FCYT', '359201', 'Física'),
    ('FCYT', '349701', 'Matemáticas'),
    ('FCYT', '389701', 'Química'),
    ('FCYT', '114071', 'Didáctica de la Matemática'),
    ('FCYT', '760101', 'Didáctica de la Física'),
    ('FCYT', '650001', 'Ingeniería Electromecánica'),
    ('FCYT', '429701', 'Ingeniería Electrónica'),
    ('FCYT', '409701', 'Ingeniería de Alimentos'),
    ('FCYT', '165221', 'Ingeniería en Biotecnología'),
    ('FCYT', '166231', 'Ingeniería en Energía'),
    ('FCYT', '170241', 'Técnico Universitario Superior en Gastronomía'),

    -- Ciencias Veterinarias
    ('FCV', '039503', 'Medicina Veterinaria y Zootecnia'),
    ('FCV', '171241', 'Técnico Universitario Superior en Veterinaria y Zootecnia'),

    -- Desarrollo Rural y Territorial
    ('FDRYT', '132091', 'Producción Agraria y Desarrollo Territorial'),
    ('FDRYT', '163211', 'Ingeniería en Gestión de Recursos Hídricos Agropecuarios'),
    ('FDRYT', '169231', 'Ingeniería en Piscicultura'),
    ('FDRYT', '168201', 'Técnico Superior en Agronomía'),

    -- Enfermería
    ('FE', '190602', 'Enfermería'),
    ('FE', '167231', 'Técnico Universitario Medio en Enfermería Comunitaria'),

    -- Humanidades y Ciencias de la Educación
    ('FHYCE', '251302', 'Ciencias de la Educación'),
    ('FHYCE', '140502', 'Comunicación Social'),
    ('FHYCE', '240101', 'Psicología'),
    ('FHYCE', '108061', 'Trabajo Social'),
    ('FHYCE', '172261', 'Lingüística Aplicada a la Enseñanza de Lenguas'),
    ('FHYCE', '145141', 'Música'),
    ('FHYCE', '147141', 'Ciencias de la Actividad Física y el Deporte'),
    ('FHYCE', '124081', 'Pedagogía Social Productiva'),
    ('FHYCE', '690602', 'Educación Intercultural Bilingüe'),
    ('FHYCE', '153141', 'Ciencias Sociales e Interculturalidad'),
    ('FHYCE', '152141', 'Lenguas Originarias y Comunicación'),
    ('FHYCE', '168231', 'Técnico Superior en Educación Infantil Parvularia'),

    -- Medicina
    ('MED', '188301', 'Medicina'),
    ('MED', '129091', 'Fisioterapia y Kinesiología'),
    ('MED', '133011', 'Nutrición y Dietética'),

    -- Odontología
    ('FODO', '179901', 'Odontología'),

    -- Politécnica del Valle Alto
    ('FPVA', '131091', 'Ingeniería Mecánica Automotriz y Maquinaria Agroindustrial'),
    ('FPVA', '720101', 'Técnico Universitario Superior en Mecánica Automotriz'),
    ('FPVA', '489201', 'Técnico Universitario Superior en Mecánica Industrial'),
    ('FPVA', '529801', 'Técnico Universitario Superior en Química Industrial'),
    ('FPVA', '569201', 'Técnico Universitario Superior en Industria de Alimentos'),
    ('FPVA', '589401', 'Técnico Universitario Superior en Construcción Civil'),
    ('FPVA', '155162', 'Técnico Universitario Medio en Enfermería'),
    ('FPVA', '123081', 'Técnico Medio en Gestión Municipal y Desarrollo Endógeno Sostenible'),
    ('FPVA', '590602', 'Auxiliar Técnico en Enfermería')
) AS v(cod_facultad, codigo, nombre)
JOIN public.facultad f ON f.codigo = v.cod_facultad
WHERE NOT EXISTS (
    SELECT 1 FROM public.carrera c
    WHERE c.id_facultad = f.id_facultad
      AND (c.nombre = v.nombre OR c.codigo = v.codigo)
);
