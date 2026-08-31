# Sistema de Control de Ingreso a Exámenes Masivos — SIGEX

**NexaCore Arquitectura de Software S.R.L.**
Convocatoria CPTIS-452026-2026 | UMSS — Taller de Ingeniería de Software

---

## Requisitos Previos

Instala esto en tu PC antes de empezar:

| Herramienta | Versión requerida | Link |
|---|---|---|
| Git | Última | https://git-scm.com |
| Java JDK | **17** (Temurin recomendado) | https://adoptium.net/es |
| Docker Desktop | Última | https://www.docker.com |
| Node.js | **20.19.0 estrictamente** | https://nodejs.org |
| pnpm | >= 8 | `npm install -g pnpm` |

> Maven **no necesitas instalarlo** — el proyecto incluye Maven Wrapper (`./mvnw`).

---

## Levantar el proyecto (primera vez)

### 1. Clonar y ubicarse en la rama de desarrollo

```bash
git clone https://github.com/Rodrigo110620/nexacore-sigex.git
cd nexacore-sigex
git checkout develop
```

### 2. Configurar variables de entorno

```bash
# Linux / macOS
cp .env.example .env

# Windows (CMD)
copy .env.example .env
```

Abre el `.env` y ajusta al menos `DB_PASSWORD` y `JWT_SECRET`.

### 3. Levantar la base de datos

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `:5432` y PgAdmin en `:5050`.

### 4. Ejecutar el backend

```bash
cd backend
./mvnw spring-boot:run          # Linux / macOS
mvnw.cmd spring-boot:run        # Windows
```

> En IntelliJ o VS Code: abrir la carpeta `backend` y pulsar el botón Run.

### 5. Ejecutar el frontend

```bash
cd frontend
pnpm install
pnpm dev
```

---

## URLs locales

| Servicio | URL |
|---|---|
| Frontend (React) | http://localhost:3000 |
| Backend API | http://localhost:8080/api/v1 |
| Health check | http://localhost:8080/api/v1/health |
| Swagger UI | http://localhost:8080/api/v1/swagger-ui/index.html |
| PgAdmin | http://localhost:5050 |

---

## Convenciones del equipo

### Ramas

```
main        → producción (solo merge de develop con PR revisada)
develop     → integración continua (rama principal de trabajo)
feature/descripcion-corta  → nueva funcionalidad
fix/descripcion-corta      → corrección de bug
```

**Regla:** Nadie hace push directo a `main`. Todo va a `develop` mediante Pull Request revisada por al menos 1 compañero.

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/):

```
feat: agregar endpoint de login JWT
fix: corregir validación de código QR duplicado
refactor: extraer lógica de examen a ExamenService
docs: actualizar README con pasos de instalación
chore: agregar migración V2 de esquema BD
test: agregar test de integración para HealthController
```

### Migraciones de base de datos

- Cada cambio de esquema va en un archivo nuevo: `V2__descripcion.sql`, `V3__descripcion.sql`...
- **Nunca modificar** archivos `V_` ya commiteados.
- Los archivos van en `backend/src/main/resources/db/migration/`.

### Variables de entorno

- **Nunca** subir `.env` a Git. Solo `.env.example` con valores de ejemplo.
- Si agregas una variable nueva, actualiza `.env.example`.

---

## Estructura del proyecto

```
nexacore-sigex/
├── .env.example              Variables de entorno (plantilla)
├── docker-compose.yml        PostgreSQL + PgAdmin
├── backend/                  Spring Boot 3 / Java 17
│   ├── mvnw / mvnw.cmd       Maven Wrapper (no necesitas Maven instalado)
│   ├── pom.xml
│   └── src/main/java/com/nexacore/examenes/
│       ├── config/           CORS, Security, Swagger
│       ├── controllers/      Endpoints REST (HealthController, ...)
│       ├── dto/              Objetos de transferencia (request/response)
│       ├── exceptions/       Manejo global de errores
│       ├── models/           Entidades JPA
│       ├── repositories/     Interfaces Spring Data JPA
│       ├── security/         Filtros JWT, UserDetailsService
│       ├── services/         Lógica de negocio
│       └── utils/            Helpers
└── frontend/                 React 18 + Vite + TypeScript + Tailwind
    └── src/
        ├── components/       Componentes reutilizables
        ├── context/          Contextos globales (AuthContext, ...)
        ├── hooks/            Custom hooks
        ├── pages/            Páginas por módulo
        │   ├── Login/
        │   ├── Dashboard/
        │   ├── ScannerQR/
        │   └── Reportes/
        ├── routes/           Definición de rutas React Router
        ├── services/         api.ts — cliente axios centralizado
        ├── types/            Tipos TypeScript globales
        └── utils/            Helpers / formatters
```

---

## Sprints (según propuesta técnica)

| Sprint | Período | Entregable |
|---|---|---|
| Sprint 1 | 31 ago – 18 sep 2026 | Arquitectura, BD, auth base. Deploy v0.1 |
| Sprint 2 | 19 sep – 08 oct 2026 | UX/UI Mobile-First, aulas, roles. Deploy v0.2 |
| Sprint 3 | 09 oct – 28 oct 2026 | Control de ingreso, QR. Deploy v0.3 |
| Sprint 4 | 29 oct – 18 nov 2026 | Auditoría, excepciones, reportes. Deploy v0.4 |
| Sprint 5 | 19 nov – 07 dic 2026 | Pruebas de estrés, manuales, capacitación. Deploy v1.0 |

---

## Equipo NexaCore

| Rol | Integrante |
|---|---|
| Product Owner / Rep. Legal | Lia Cardenas Morales |
| Scrum Master | Aaron David Rafael Montaño |
| Dev Team | Rodrigo Figueroa Camacho |
| Dev Team | Fernando Pereira Torrico |
| Dev Team | Wilber Ojeda Valente |
| Dev Team | Marcelo Vallejos Tinta |
